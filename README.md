# Simple Data Pipe connector for trello.com

:no_entry_sign: This project is no longer maintained.

This connector uses [the Trello REST API](https://developers.trello.com/get-started/intro) to fetch information about lists and cards for one or more boards. The [Simple Data Pipe SDK](https://github.com/ibm-cds-labs/simple-data-pipe-sdk) is used to store the data in Cloudant. One JSON record is created for each list and card in the selected board(s):

#####Board record structure
```json
{
 "..." : "<cloudant document properties such as _id and _rev>",
 "type": "board",
 "data": {
 		  "<board_properties>" : "see https://developers.trello.com/advanced-reference/member#get-1-members-idmember-or-username-boards"	
		 },
 "pt_type": "<trello_board_id>"		 		 
}
```

#####List record structure
```json
{
"..." : "<cloudant document properties such as _id and _rev>",
 "type": "list",
 "data": {
 		  "<list_properties>" : "see https://developers.trello.com/advanced-reference/board#get-1-boards-board-id-lists"	
		 },
 "pt_type": "<trello_board_id>"		 
}
```

#####Card record structure
```json
{
"..." : "<cloudant document properties such as _id and _rev>",
 "type": "card",
 "data": {
 		  "<card_properties>" : "see https://developers.trello.com/advanced-reference/board#get-1-boards-board-id-cards"	
		 },
"pt_type": "<trello_board_id>"		 		 
}
```


Need to load data from other sources? Check out the [connector repository](https://developer.ibm.com/clouddataservices/simple-data-pipe-connectors/).

### Pre-requisites

##### General 
Verify the following:
 * You have a valid user id for the Trello board you want the Simple Data Pipe to access.
 * The Trello board is configured to allow application access.
 * You are registered as a [Trello Developer](https://developers.trello.com/) to configure OAuth access for the Simple Data Pipe.

##### Deploy the Simple Data Pipe

 [Deploy the Simple Data Pipe in Bluemix](https://github.com/ibm-cds-labs/simple-data-pipe) using the Deploy to Bluemix button or manually.

##### Services

This connector does not require any additional Bluemix service.

##### Install the Simple Data Pipe connector for Trello

  When you [follow these steps to install this connector](https://github.com/ibm-cds-labs/simple-data-pipe/wiki/Installing-a-Simple-Data-Pipe-Connector), add the following line to the dependencies list in the `package.json` file: 

```
"simple-data-pipe-connector-trello": "git://github.com/ibm-cds-labs/simple-data-pipe-connector-trello.git",
```

##### Enable OAuth support and collect connectivity information

 You need to register the Simple Data Pipe application before you can use this connector to load data.
 
  * TODO? Yup!

### Using the Simple Data Pipe connector for trello.com

To configure and run a pipe

1. Open the Simple Data Pipe web console.
2. Select __Create A New Pipe__.
3. Select __Trello__ for the __Type__ when creating a new pipe.  
4. In the _Connect_ page, enter the _application id_ and _secret_ from the Trello application settings page.
5. When prompted, authorize the Simple Data Pipe application to access your Trello boards in read-only mode. 
6. Select a board (or All boards) from which to fetch list and card information.
7. Schedule or run the data pipe now.

#### License 

Copyright [2016] IBM Cloud Data Services

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
