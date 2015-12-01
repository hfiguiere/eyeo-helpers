(function() {
  "use strict";

  var options = {
    delay: 100,
    max: 5,
    matchSubset: false
  };

  var script = document.createElement("script");
  script.type = "text/javascript";
  script.text = '$(".ac_input").setOptions(' + JSON.stringify(options) + ');';
  document.body.appendChild(script);
}());
