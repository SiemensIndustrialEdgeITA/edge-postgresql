'use strict'

const os = require( 'os' );

const networkRoutes = (app) => {

    // GET IP OF CONTAINER
    app.get('/networkip', function(req, res) {
      var networkInterfaces = os.networkInterfaces();
      let ipAddresses = [];
      for (let iface in networkInterfaces){
        if (iface != "lo"){
          ipAddresses.push(networkInterfaces[iface][0]["address"]);
        }
      }
      let allIPs =  ipAddresses.join(", ")
      //res.status(200).send({"address": ipAddresses[0]});
      res.status(200).send({"address": allIPs});
      });

};

module.exports = networkRoutes;