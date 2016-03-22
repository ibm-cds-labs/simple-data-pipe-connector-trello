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

var _ = require('lodash');

/**
 * Creates a new Trello storage instance. 
 * @class
 * @param {Object} pushRecordFn - function to be invoked to store Trello records.
 */
function TrelloStorage(pushRecordFn) {
	
	var sdpRecordFn = pushRecordFn;

	/**
	 * Internal only: Creates a JSON record of the specified type for each Trello object.
	 * @param {string} type - record type
	 * @param {Object[]} objects - a single Trello object or an array of Trello objects of the specified type
	 */
	var saveData = function(type, trelloObjects) {

		if (trelloObjects) {
			if(trelloObjects.constructor !== Array) {	// force array type
				trelloObjects = [trelloObjects];
			}
			if(trelloObjects.length > 0) {
				// Store information in Cloudant; pushRecordFn method accepts a single record or an array of records as parameter	    			 
				sdpRecordFn(_.map(trelloObjects, 
					              function(trelloObject) {
								        return({
								        	    type: type, 
								        	    data: trelloObject
								        	  });
								  })
				           );
			}
		}
	};

	/**
	 * Saves a single Trello board object or an array of Trello board objects to Cloudant
	 * @param {Object[]} - list of Trello board objects to be saved
	 */
	this.saveBoards = function(trelloBoards) {
		saveData('board', trelloBoards);
	};

	/**
	 * Saves a single Trello list object or an array of Trello list objects to Cloudant
	 * @param {Object[]} - list of Trello list objects to be saved
	 */
	this.saveLists = function(trelloLists) {
		saveData('list', trelloLists);
	};

	/**
	 * Saves a single Trello card object or an array of Trello card objects to Cloudant
	 * @param {Object[]} - list of Trello card objects to be saved
	 */
	this.saveCards = function(trelloCards) {
		saveData('card', trelloCards);
	};

} // TrelloStorage

module.exports = TrelloStorage; 