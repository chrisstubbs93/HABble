var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Accel = require('ui/accel');
var Vibe = require('ui/vibe');


var getPayloads = function(data) {
  var items = [];
  
  
  var flightsArray = data.rows;
  var flightsList = "";

  for (var i = 0; i < flightsArray.length; ++i) {
    if(flightsArray[i].doc.type == "payload_configuration")//only show payloads otherwise you get flights AND their payloads in the list
    {
      var description = "";
      if (typeof flightsArray[i].doc.metadata != "undefined") {description = flightsArray[i].doc.metadata.description;}
      // Add to menu items array
      items.push({
        title:flightsArray[i].doc.name,
        subtitle:description,
        payloadID:flightsArray[i].doc._id,
        flightID:flightsArray[i].id
      });
      flightsList += flightsArray[i].doc.name + "," + flightsArray[i].doc._id; //list will contain PAYLOAD_NAME,PAYLOAD_ID;NEXT_PAYLOAD_NAME,NEXT_PAYLOAD_ID
      if(i != flightsArray.length-1)//add semicolons between flight names unless we are on the last one (eg "B-1,SOME_ID;B-2,SOME_ID;B-3,SOME_ID.....B-63,SOME_ID;B-64,SOME_ID")
      {flightsList += ";";}
    }
  }
  console.log("flightsList contains: " + flightsList);
  
  // Finally return whole array
  return items;
};

// Show splash screen while waiting for data
var splashWindow = new UI.Window();

// Text element to inform user
var text = new UI.Text({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  text:'Downloading data from habitat...',
  font:'GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
	backgroundColor:'white'
});

// Add to splashWindow and show
splashWindow.add(text);
splashWindow.show();

// Make request to habitat
ajax(
  {
    url:'http://habitat.habhub.org/habitat/_design/flight/_view/end_start_including_payloads?startkey=[' + Math.floor(Date.now() / 1000) + ']&include_docs=True',
    type:'json'
  },
  function(data) {
    // Create an array of Menu items
    var menuItems = getPayloads(data);

    // Construct Menu to show to user
    var resultsMenu = new UI.Menu({
      sections: [{
        title: 'Current Payloads:',
        items: menuItems
      }]
    });

    // Add an action for SELECT
resultsMenu.on('select', function(e) {
  splashWindow.show();
  
  // Request the most recent telemetry string from habitat
  console.log('Requesting:' + 'http://habitat.habhub.org/habitat/_design/payload_telemetry/_view/flight_payload_time?startkey=["' + e.item.flightID + '","' + e.item.payloadID + '",[]]&endkey=["' + e.item.flightID + '","' + e.item.payloadID + '"]&include_docs=True&descending=True&limit=1');
  ajax(
    {
      url:'http://habitat.habhub.org/habitat/_design/payload_telemetry/_view/flight_payload_time?startkey=["' + e.item.flightID + '","' + e.item.payloadID + '",[]]&endkey=["' + e.item.flightID + '","' + e.item.payloadID + '"]&include_docs=True&descending=True&limit=1',
      type:'json'
    },
    function(data) {
      var telemetryArray = data.rows;
      var content = "ID:" + telemetryArray[0].doc.data.sentence_id.toString() + "\n";
      content += "Time:" + telemetryArray[0].doc.data.time + "\n";
      content += "Longitude:" + telemetryArray[0].doc.data.longitude.toString() + "\n";
      content += "Latitude:" + telemetryArray[0].doc.data.latitude.toString() + "\n";
      content += "Altitude:" + telemetryArray[0].doc.data.altitude.toString() + "\n";
      
      // Notify the user
      Vibe.vibrate('short');
      
      // Create the Card for detailed view
      var detailCard = new UI.Card({
        title:e.item.title,
        //subtitle:e.item.subtitle,
        body: content,
        style:"small"
      });
      splashWindow.hide();
      detailCard.show();
      
    },
    function(error) {
      console.log('Download failed: ' + error);
    }
  );
  

});

// Show the Menu, hide the splash
resultsMenu.show();
splashWindow.hide();
    
    
    // Register for 'tap' events
    resultsMenu.on('accelTap', function(e) {
      splashWindow.show();
      // Make another request to habitat
      ajax(
        {
          url:'http://habitat.habhub.org/habitat/_design/flight/_view/end_start_including_payloads?startkey=[' + Math.floor(Date.now() / 1000) + ']&include_docs=True',
          type:'json'
        },
        function(data) {
          // Create an array of Menu items
          var newItems = getPayloads(data, 10);
          
          // Update the Menu's first section
          resultsMenu.items(0, newItems);
          
          resultsMenu.show();
          splashWindow.hide();
          
          // Notify the user
          Vibe.vibrate('short');
        },
        function(error) {
          console.log('Download failed: ' + error);
        }
      );
    });
  },
  function(error) {
    console.log("Download failed: " + error);
  }
);

// Prepare the accelerometer
Accel.init();
