/* globals $ */

"use strict";

// Add handy toggles for control keys to Webmate's test VM web client

(function()
{
  function setupKeyToggleButtons()
  {
    let keyTogglesSpan = document.createElement("span");
    keyTogglesSpan.id = "keyToggles";

    function onKeyToggleClick(event)
    {
      let button = event.target;
      let {keyCode} = button;
      let active = button.classList.toggle("active");

      $("#console").wmks("sendKeyCode", keyCode, active ? "keydown" : "keyup");

      // FIXME add a stylesheet for .active instead
      button.style = active ? "font-weight: bold;" : "";

      let {scrollX, scrollY} = window;
      document.getElementById("mainCanvas").focus();
      window.scrollTo(scrollX, scrollY);

      return false;
    }

    let keys = {
      shift: 16,
      control: 17,
      windows: 91,
      alt: 18
    };
    for (let keyName in keys)
    {
      let button = document.createElement("a");
      button.innerText = keyName;
      button.keyCode = keys[keyName];
      button.addEventListener("click", onKeyToggleClick);
      keyTogglesSpan.appendChild(button);
      keyTogglesSpan.appendChild(document.createTextNode(" "));
    }

    document.getElementById("buttonArea").appendChild(keyTogglesSpan);
  }

  let script = document.createElement("script");
  script.type = "text/javascript";
  script.text = "(" + setupKeyToggleButtons.toString() + "());";
  script.async = false;
  document.body.appendChild(script);
  document.body.removeChild(script);
}());
