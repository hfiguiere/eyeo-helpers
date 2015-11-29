(function() {
  "use strict";

  var options = {
    matchCase: true
  };

  var script = document.createElement("script");
  script.type = "text/javascript";
  script.text = '$(".ac_input").setOptions(' + JSON.stringify(options) + ');';
  document.body.appendChild(script);
}());
