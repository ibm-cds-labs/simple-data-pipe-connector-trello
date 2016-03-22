//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------

'use strict';

var util = require('util');
var _ = require('lodash');
var async = require('async');

var pipesSDK = require('simple-data-pipe-sdk');
var connectorExt = pipesSDK.connectorExt;

var bluemixHelperConfig = require.main.require('bluemix-helper-config');
var global = bluemixHelperConfig.global;

var TrelloStorage = require('./trelloStorage');

// This connector uses the (OAuth1.0) passport strategy module (http://passportjs.org/) for Trello.
var dataSourcePassportStrategy = require('passport-trello').Strategy; 

// https://www.npmjs.com/package/trello
var Trello = require('trello');

/**
 * Simple Data Pipe connector boilerplate for Trello, using OAuth1.0 authentication. 
 * Build your own connector by following the TODO instructions
 * TODO: rename the class
 */
function oAuthTrelloConnector(){

	 /* 
	  * Customization is mandatory
	  */

	// TODO: 
	//   Replace 'Yahoo OAuth Data Source' with the desired display name of the data source (e.g. 'Yahoo fantasy sports') from which data will be loaded
	var connectorInfo = {
						  id: require('../package.json').simple_data_pipe.name,			// derive internal connector ID from package.json
						  name: 'Trello'												// TODO; change connector display name
						};

	// TODO: customize options						
	var connectorOptions = {
					  		recreateTargetDb: true, // if set (default: false) all data currently stored in the staging database is removed prior to data load
					  		useCustomTables: true   // keep true (default: false)
						   };						

	// Call constructor from super class; 
	connectorExt.call(this, 
					 	connectorInfo.id, 			
					 	connectorInfo.name, 
					 	connectorOptions	  
					 );	

	// writes to the application's global log file
	var globalLog = this.globalLog;

	// an instance of https://www.npmjs.com/package/trello 
	var trelloAPI = null;

	/*
	 * ---------------------------------------------------------------------------------------
	 * Override Passport-specific connector methods:
	 *  - getPassportAuthorizationParams
	 *  - getPassportStrategy
	 *  - passportAuthCallbackPostProcessing
	 * ---------------------------------------------------------------------------------------
	 */

	/**
	 * The Trello OAuth1.0 API does not require extra authorization parameters
	 * @override
	 * @returns {} 
	 */
	this.getPassportAuthorizationParams = function() {
       return {};
	}; // getPassportAuthorizationParams

	/**
	 * Returns a fully configured Passport strategy for yahoo. The passport verify
	 * callback adds two properties to the profile: oauth_access_token and oauth_token_secret.
	 * @override
	 * @returns {Object} Passport strategy for yahoo.
	 * @returns {Object} profile - user profile returned by reddit
	 * @returns {string} profile.oauth_access_token
	 * @returns {string} profile.oauth_token_secret
	 */
	this.getPassportStrategy = function(pipe) {

		globalLog.info('Creating Passport strategy ...');	

		return new dataSourcePassportStrategy({
			consumerKey: pipe.clientId,											 // mandatory; oAuth client id; do not change
	        consumerSecret: pipe.clientSecret,									 // mandatory; oAuth client secret;do not change
	        callbackURL: global.getHostUrl() + '/authCallback',		 			 // mandatory; oAuth callback; do not change
	        passReqToCallback: true,
	        trelloParams: {
        					scope: 'read',
        					name: 'Simple Data Pipe demo application',
        					expiration: '1day'									 // TODO, replace as needed with "1hour", "1day", "30days", "never"
        				  }
		  },
		  function(req, token, tokenSecret, profile, done) {			 

			  // The profile includes information such as organization(s) the user belongs to, boards that can be accessed, etc 	
		  	  globalLog.debug('Trello returned the following profile: ' + util.inspect(profile,3));

			  process.nextTick(function () {

			  	// attach the obtained access token to the user profile
		        profile.oauth_access_token = token; 

			  	// attach the obtained token secret to the user profile		        
		        profile.oauth_token_secret = tokenSecret; 

		        // return the augmented profile
			    return done(null, profile);
			  });
		  }
		);
	}; // getPassportStrategy

	/**
	 * TODO Change the method as needed
	 * Attach OAuth tokens and list of available data sets to data pipe configuration.
	 * @param {Object} profile - the output returned by the passport verify callback
	 * @param {pipe} pipe - data pipe configuration, for which OAuth processing has been completed
	 * @param callback(err, pipe ) error information in case of a problem or the updated pipe
	 */
	this.passportAuthCallbackPostProcessing = function( profile, pipe, callback ){
		
		// use globalLog to write to the application log

		if((!profile) || (! profile.oauth_access_token) || (! profile.oauth_token_secret)) {
			globalLog.error('Internal application error: OAuth parameter is missing in passportAuthCallbackPostProcessing');
			return callback('Internal application error: OAuth parameter is missing.'); 
		}

		if(!pipe) {
			globalLog.error('Internal application error: data pipe configuration parameter is missing in passportAuthCallbackPostProcessing');
			return callback('Internal application error: data pipe configuration parameter is missing.'); 
		}

        // Attach the token(s) and other relevant information from the profile to the pipe configuration.
        // Use this information in the connector code to access the data source

		pipe.oAuth = { 
						accessToken : profile.oauth_access_token, 
						refreshToken: profile.oauth_token_secret 
					};

		// invalidate the consumer 			
		trelloAPI = null;			

		// Fetch list of data sets that the user can choose from; the list is displayed in the Web UI in the "Filter Data" panel.
        // Attach data set list to the pipe configuration
        this.getTrelloDataSetList(pipe, function (err, pipe){
		    if(err) {
		    	globalLog.error('OAuth post processing failed. The Trello data set list could not be created for data pipe configuration ' + pipe._id + ': ' + err);
		    }	
		    else {
			    globalLog.debug('OAuth post processing completed. Data pipe configuration was updated: ');
			    globalLog.debug(' ' + util.inspect(pipe,3));
		    }	

			return callback(err, pipe);
		});

	}; // passportAuthCallbackPostProcessing

	/**
	  * Fetches list of Trello data set(s) that the user can choose from. At least one data set must be returned or the
	  * user will not be able to run the data pipe.
	  * @param {Object} pipe - data pipe configuration
	  * @param {callback} done - callback(err, updated_data_pipe_confguration) to be invoked when processing is done 
	  */
	this.getTrelloDataSetList = function(pipe, done) {

		// List of Trello data sets a user can choose from; at least one data set entry needs to be provided.
		var dataSets = [];

		// Initialize Trello API interface (the OAuth consumer)
		if(! trelloAPI) {
			initializeTrelloAPI(pipe);
		}
		
		// TODO:
		// Add Trello data sets that the user can choose from. At least one data set entry must be defined.
		// Add data sets statically
		// dataSets.push({label:'Static Trello data set 1', name:'trello_ds_1'});

		// .. or dynamically, for example, based on results returned by a Trello query.
		// Run some Trello query, extract relevant information and add to dataSets:

		trelloAPI.getBoards('me', 
			                function (err, boards) {

       			if(err) {
        			globalLog.error('Error fetching board list: ' + util.inspect(err,3));
        			return done('Error fetching board list: ' + JSON.parse(err.data).error.description);
        		}

        		globalLog.debug('getBoards API response - data : ' + util.inspect(boards,4));

        		_.forEach(boards, function (board) {
					dataSets.push({label:board.name, name: board.id});
        		});

				// TODO: If you want to provide the user with the option to load all data sets concurrently, define a single data set that 
				// contains only property 'labelPlural', with a custom display label: 
				// dataSets.push({labelPlural:'All Boards'});			

				// In the Simple Data Pipe UI the user gets to choose from: 
				//  -> All data sets 
				//  -> Static Trello data set 1
				//  -> Dynamic Trello data set
				//  -> ...

				// sort list by display label and attach the information to the data pipe configuration; if present, the ALL_DATA option should be displayed first
				pipe.tables = dataSets.sort(function (dataSet1, dataSet2) {					
																		if(! dataSet1.label)	{ // ALL_DATA (only property labelPlural is defined)
																			return -1;
																		}

																		if(! dataSet2.label) {// ALL_DATA (only property labelPlural is defined)
																			return 1;
																		}

																		return dataSet1.label.localeCompare(dataSet2.label);
																	   });

				// Invoke callback and pass along the updated data pipe configuration, which now includes a list of Trello data sets the user
				// gets to choose from.
				return done(null, pipe);

			}
		); 
	}; // getTrelloDataSetList


	/*
	 * ---------------------------------------------------------------------------------------
	 * Override general connector methods:
	 *  - doConnectStep: verify that OAuth information is still valid
	 *  - fetchRecords:  load data from data source
	 * ---------------------------------------------------------------------------------------
	 */

	/**
	* Customization might be required.
	* During data pipe runs, this method is invoked first. Add custom code as required, for example to verify that the 
	* OAuth token has not expired.
	* @param {callback} done - callback(err) that must be called when the connection is established
	* @param {Object} pipeRunStep
	* @param {Object} pipeRunStats
	* @param {Object} pipeRunLog - a dedicated logger instance that is only available during data pipe runs
	* @param {Object} pipe - data pipe configuration
	* @param {Object} pipeRunner
	*/
	this.doConnectStep = function( done, pipeRunStep, pipeRunStats, pipeRunLog, pipe, pipeRunner ){

		// Use the Trello OAuth information in pipe.oAuth in your API requests. 

		// Bunyan logging - https://github.com/trentm/node-bunyan
		// The log file is attached to the pipe run document, which is stored in the Cloudant repository database named pipe_db.
		// To enable debug logging, set environment variable DEBUG to '*' or to 'sdp-pipe-run' (without the quotes).
		pipeRunLog.info('Verifying OAuth connectivity for data pipe ' + pipe._id);

		// Initialize Trello API interface (the OAuth consumer)
		if(! trelloAPI) {
			initializeTrelloAPI(pipe);
		}

		// Invoke done callback to indicate that connectivity to the data source has been validated
		// Parameters:
		//  done()                                      // no parameter; processing completed successfully. no status message text is displayed to the end user in the monitoring view
		//  done({infoStatus: 'informational message'}) // processing completed successfully. the value of the property infoStatus is displayed to the end user in the monitoring view
		//  done({errorStatus: 'error message'})        // a fatal error was encountered during processing. the value of the property infoStatus is displayed to the end user in the monitoring view
		//  done('error message')                       // deprecated; a fatal error was encountered during processing. the message is displayed to the end user in the monitoring view
		if(trelloAPI) {
			return done();
		}
		else {
			pipeRunLog.error('The Trello API interface could not be initialized. Aborting data pipe run because no API calls can be processed.');
			return done({errorStatus: 'The Trello API interface could not be initialized.'});
		}
			
	}; // doConnectStep

	/*
	 * Customization is mandatory!
	 * Implement the code logic to fetch data from the source, optionally enrich it and store it in Cloudant.
	 * @param {Object} dataSet - dataSet.name contains the data set name that was (directly or indirectly) selected by the user
	 * @param {callback} done - callback function to be invoked after processing is complete (or a fatal error has been encountered)
	 * @param {Object} pipe - data pipe configuration
	 * @param {Object} pipeRunLog - a dedicated logger instance that is only available during data pipe runs
	 */
	this.fetchRecords = function( dataSet, pushRecordFn, done, pipeRunStep, pipeRunStats, pipeRunLog, pipe, pipeRunner ){

		// The data set is typically selected by the user in the "Filter Data" panel during the pipe configuration step
		// dataSet: {name: 'data set name', label: 'data set label'}. However, if you enabled the ALL option and it was selected, 
		// the fetchRecords function is invoked asynchronously once for each data set. See getTrelloDataSetList

		// Bunyan logging - https://github.com/trentm/node-bunyan
		// The log file is attached to the pipe run document, which is stored in the Cloudant repository database named pipe_db.
		// To enable debug logging, set environment variable DEBUG to '*' or to 'sdp-pipe-run' (without the quotes).
		pipeRunLog.info('Data pipe ' + pipe._id + ' is fetching data for data set ' + dataSetNameAndLabelToString(dataSet) + ' from Trello.');

		// Use the Trello OAuth information in pipe.oAuth in your API requests. See passportAuthCallbackPostProcessing


        // create an instance of the Trello storage class which formats the data and writes it to Cloudant using pushRecordFn
		var ts = new TrelloStorage(pushRecordFn);

		async.series([
			    	  function (callback) {
			    	  			    pipeRunLog.info('Fetching info for board ' + dataSetNameAndLabelToString(dataSet));	
									// fetch current board info
									trelloAPI.getBoards('me', 
														function(err, boards){

															var board = _.find(boards, 
												        						 function (board) {
																					return (board.id === dataSet.name);	
												        				  });	

															if(board) {
																// save Trello board info to Cloudant
													        	ts.saveBoards(board);
													        	return callback(null, 1);	
															}
															else {
																return callback('Board ' + dataSetNameAndLabelToString(dataSet) + ' was not found.', null);
															}
														});
	  				  },
	  				  function (callback) {
			    	  			    pipeRunLog.info('Fetching lists for board ' + dataSetNameAndLabelToString(dataSet));	
									// fetch lists for board
									trelloAPI.getListsOnBoard(dataSet.name, 
														function(err, lists){

															if(lists === 'invalid id')	{
																err = 'Board ' + dataSetNameAndLabelToString(dataSet) + ' does not exist.';
															}

												        	if(err) {
												        		pipeRunLog.error('Error fetching lists for board ' + dataSetNameAndLabelToString(dataSet) + ': ' + util.inspect(err,3));
												        		return callback('Error fetching lists for board ' + dataSet.label + ': ' + err, null);
												        	}

												        	pipeRunLog.debug('Board list API response - data : ' + util.inspect(lists,4));

															// save Trello list objects to Cloudant
														    ts.saveLists(lists);
												        	callback(null, lists.length);	
														});

	  				  },
	  				  function (callback) {
			    	  			    pipeRunLog.info('Fetching cards for board ' + dataSetNameAndLabelToString(dataSet));	
									// fetch lists for board
									trelloAPI.getCardsOnBoard(dataSet.name, 
														function(err, cards){

															if(cards === 'invalid id')	{
																err = 'Board ' + dataSetNameAndLabelToString(dataSet) + ' does not exist.';
															}

												        	if(err) {
												        		pipeRunLog.error('Error fetching cards for board ' + dataSetNameAndLabelToString(dataSet) + ': ' + util.inspect(err,3));
												        		return callback('Error fetching cards for board ' + dataSet.label + ': ' + err, null);
												        	}

												        	pipeRunLog.debug('Board list API response - data : ' + util.inspect(cards,4));

															// save Trello list objects to Cloudant
														    ts.saveCards(cards);
												        	callback(null, cards.length);	
														});
	  				  }
			  		 ],
			function(err, recordCount){

				// Invoke done callback to indicate that data set dataSet has been processed. 
				// Parameters:
				//  done()                                      // no parameter; processing completed successfully. no status message text is displayed to the end user in the monitoring view
				//  done({infoStatus: 'informational message'}) // processing completed successfully. the value of the property infoStatus is displayed to the end user in the monitoring view
				//  done({errorStatus: 'error message'})        // a fatal error was encountered during processing. the value of the property infoStatus is displayed to the end user in the monitoring view

				if(err) {
					return done({errorStatus: err});	
				}

				return done({infoStatus: 'Fetched ' + recordCount[1] + ' list(s), and ' + recordCount[2] + ' card(s).'});

			});

	}; // fetchRecords

	/*
	 * Customization is not needed.
	 */
	this.getTablePrefix = function(){
		// The prefix is used to generate names for the Cloudant staging databases that store your data. 
		// The recommended value is the connector ID to assure uniqueness.
		return connectorInfo.id;
	};


	/*
	 *  --------------------------------------------------------------------------------------------------------------------
	 *   Internal helper methods
	 *  --------------------------------------------------------------------------------------------------------------------
	 */

    /**
     * Instantiates OAuth consumer that can be used for Trello API calls
     * @param {Object} pipe - data pipe configuration
     */
	var initializeTrelloAPI  = function(pipe) {

		if(pipe) {

			// TODO Verify access token validity 

			// Sample Trello API: https://github.com/norberteder/trello
			trelloAPI = new Trello(pipe.clientId, 
								   pipe.oAuth.accessToken);

		}
		else {
			trelloAPI = null;
		}
	}; // function initializeTrelloAPI

	/**
	 *
	 * @param {Object} dataSet - the data set being processed. Properties:
	 *                           {String} name - board ID
	 *                           {String} label - board display name 
	 */
	var dataSetNameAndLabelToString = function(dataSet) {
		return dataSet.label + ' (' + dataSet.name + ')';
	}; // function dataSetNameAndLabelToString

} // function oAuthTrelloConnector

//Extend event Emitter
util.inherits(oAuthTrelloConnector, connectorExt);

module.exports = new oAuthTrelloConnector(); 
