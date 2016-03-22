> Hey there! So you want to build your own Simple Data Pipe connector? [Start here](https://github.com/ibm-cds-labs/simple-data-pipe-connector-template/wiki/How-to-build-a-Simple-Data-Pipe-connector-using-this-template).

***


# Simple Data Pipe connector for trello.com

This connector uses [the Trello REST API](https://developers.trello.com/get-started/intro) to fetch cards from one or more boards and the [Simple Data Pipe SDK](https://github.com/ibm-cds-labs/simple-data-pipe-sdk) to store them in Cloudant. 

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

> BETA ONLY
```
"simple-data-pipe-connector-trello": "https://github.com/ibm-cds-labs/simple-data-pipe-connector-trello.git#pp_validation"
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