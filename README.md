jquery.wps.client
==

A visual interactive webapp client to OGC Web Processing Service developed as jQuery plugin.

## Dependencies

This plugin needs the js library/frameworks listed below. 

Include these dependencies in your page.

- [jquery](http://jquery.com)
- [jquery-ui](https://jqueryui.com/)
- [can.js](http://canjs.com)
- [jquery.loadmask](https://code.google.com/p/jquery-loadmask)
- [prettify](http://google-code-prettify.googlecode.com/svn/trunk/README.html)
- [font-awesome (3.2.1)](http://fortawesome.github.io/Font-Awesome/3.2.1/)
- [bootstrap (2.3.2)](http://getbootstrap.com/2.3.2/)
- [bootbox](http://bootboxjs.com/)
- [jquery.multiFieldExtender](http://ymcaeastbay.org/js/jquery/jquery.multiFieldExtender-2.0.js)
- jquery.namespace (included)


## Getting started

> Assumption: all dependencies above are copied in the **path-to-deps** folder and the wps-client library in 
**path-to-lib** 

First include all js/css dependencies:
```html
<link href="path-to-deps/ui-lightness/jquery-ui.css" rel="stylesheet" />
<link href="path-to-deps/bootstrap.css" rel="stylesheet" />
<link href="path-to-deps/jquery.loadmask.css" rel="stylesheet" />
<link href="path-to-deps/prettify.css" rel="stylesheet" />
<link href="path-to-deps/font-awesome/css/font-awesome.min.css" rel="stylesheet" />

<script src="path-to-deps/jquery-1.9.1.min.js"></script>
<script src="path-to-deps/jquery-ui-1.8.9.custom.min.js"></script>
<script src="path-to-deps/jquery.multiFieldExtender-2.0.min.js"></script>
<script src="path-to-deps/can.custom.js"></script>
<script src="path-to-deps/bootbox.min.js"></script>
<script src="path-to-deps/prettify/prettify.js"></script>
<script src="path-to-deps/jquery.namespace.js"></script>
<script src="path-to-deps/bootstrap.min.js"></script>
<script src="path-to-deps/jquery.loadmask.js"></script>
```

Include base script/css *after* the jQuery library: 

```html
<script src="/path-to-lib/js/jquery.wps.client.js"></script>
<link src="/path-to-lib/css/jquery.wps.client.css"></link>
```

Add an empty container to your HTML page:

```html
<body>
    ....
    <div id="myWpsDiv"></div>
</body>
```

When the page is loaded ($.ready), call the plugin starting by the jquery selector
```javascript
$(document).ready(function(){
    $("#myWpsDiv").wpsClient({
        libPath: path-to-lib,
        baseUrl: "http://wps01.i-marine.d4science.org/wps/WebProcessingService",
    });
})
```

## Configuration

### Basic Usage

```javascript
$(selector).wpsClient(options);
```

### Options

| Option           | Type       | Mandatory | Default          | Description     |
| ---------------- | ---------- | --------- | ---------------- | --------------: |
| **baseUrl**      | String     | yes       | ---              | The base wps url (without "?" and parameters) |
| **libPath**      | String     | no        | imports/js/jquery.oozie | The path where to reach the library (absolute or relative) |
| **wpsVersion**   | String     | no        | 1.0.0            | The wps version |
| **ns**           | Object     | no        | { wps: "http://www.opengis.net/wps/1.0.0", ows:"http://www.opengis.net/ows/1.1"} | The wps and ows namespace urls |
| **errorHandler** | Function(xhr) | no     | null             | The callback handler when some ajax server request goes bad |
| **pollingTime**  | Integer    | no        | 2000             | The polling time to check jobs status (in ms)

### Methods
| Option      | Parameters  | Returns   | Description     |
| ----------- | ----------- | --------- | --------------: |
| **reload**  | none        | none      | Used to manually reload the WPS getCapabilities request |

### WPS Server and CORS

Since the wps.client issues ajax requests to a WPS server, you should check it there are any [CORS](https://developer.mozilla.org/en-US/docs/HTTP/Access_control_CORS) issues. 

If the page using wps.client is hosted in the same server running the OGC WPS server (same protocol, host and port), all ajax requests are allowed; otherwise a cors filter is needed in the WPS Server.

>For security reasons, on Chrome and Opera you cannot use XMLHttpRequest to load local files.

Have fun!
