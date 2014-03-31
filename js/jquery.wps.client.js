/*

 JQuery WPS Client - By Ceras

 dependencies:
 	- canjs
	- jquery.loadmask
	- prettyprint
	- font-awesome
	- bootstrap
	- bootbox
	- jquery.multiFieldExtender
	- jquery.namespace
	
*/

WpsClient = {
	defaultOptions: {
		libPath: "imports/js/jquery.oozie",
		//baseUrl: MANDATORY
		wpsVersion: "1.0.0",
		ns: {
			wps: "http://www.opengis.net/wps/1.0.0",
			ows:"http://www.opengis.net/ows/1.1"
		},
		errorHandler: null,
		pollingTime: 2000,
	},
};

// utilities
String.prototype.startsWith = function(needle) {
	return(this.indexOf(needle) == 0);
};
String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
function selectInputText(inputEl){
	inputEl.focus();
	inputEl.select();
}




;(function($){

$.fn.wpsClient = function(options){
	
	
	function startWpsWebClient() {
		
		data.jobs = new can.Observe.List([]);
		data.jobNames = [],	
		
		console.log("BASE URL", options.baseUrl);
		
		// create control for jobs list
		JobsControl = can.Control({
			init: function(element, opt){
				$(element).html(can.view.render(options.libPath + "/ejs/jobsList.ejs", data.jobs));
				$jobDetails.html(can.view.render(options.libPath + "/ejs/jobDetails.ejs", data.jobs));
			},
			"a click": function(elem, event){
				showResult(elem.data("job"));
			}
		});
		//WWCConf.jobsControl = 
		new JobsControl($lastJobs, {});
		
		Status = {
			PENDING: 0,
			RUNNING: 1,
			SUCCESS: 2,
			ERROR: 3
		};
		
		loadCapabilities(data.url);
		checkStatusPolling();
	}
	
	function checkStatusPolling() {
		setTimeout(function(){
			if ($mainDiv.find(".checkboxPolling").is(':checked'))
				updateStatus();
			checkStatusPolling();
		}, options.pollingTime);
	}

	function updateStatus(){
		$.each(data.jobs, function(){
			var job = this, ns = options.ns;
			
			// check the status only if:
			// 1) the job is async;
			// 2) the statusLocation is set;
			// 3) the status is RUNNING;
			if (!job.isSync && job.statusLocation!=null && job.status==Status.RUNNING){
				$.get(job.statusLocation, function(result, status, jqXHR) {
					var $result = $(result);
					
					// if process succeeded
					if ($result.findNsURI(ns.wps, "ProcessSucceeded").length>0) {
						job.attr( { status:Status.SUCCESS, isTerminated:true, xml:$result } );
						Notificator.show("Job " + job.attr("jobName") + " succeeded");
						if (job.attr("active")){
							showResult(job);
						}						
					}
					
					else if ($result.findNsURI(ns.wps, "ProcessFailed").length>0) {
						job.attr( { status:Status.ERROR, isTerminated:true, xml:$result } );
						Notificator.show("Job " + job.attr("jobName") + " failed");
						if (job.attr("active"))
							showResult(job);
					}
					
					// if process is yet running
					else if ($result.findNsURI(ns.wps, "ProcessStarted").length>0){
						var $processStarted = $result.findNsURI(ns.wps, "ProcessStarted"),
							percentCompleted = $processStarted.attr("percentCompleted");
						job.attr("percent", percentCompleted==null ? $processStarted.text() : percentCompleted);
					}
					//console.log($xml);					
				});
			}				
		});
	}

	function createJob(id, title, isSync, formData) {
		// create an unique jobName
		var jobName = title;
		if (data.jobNames[title]==null)
			data.jobNames[title]=1;
		else
			jobName += " ("+(data.jobNames[title]++)+")";
		
		return {
			id: id,
			jobName: jobName,
			title: title,
			status: Status.PENDING,
			percent: 0,
			isSync: isSync,
			isTerminated: false,
			time: new Date(),
			active: false,
			parameters: formData.parameters,
			url: formData.url,
			executions: [],
		};
	}

	function loadCapabilities(url) {
		
		$list.empty().parent().mask("Load Capabilities...");
		$formArea.empty().mask("Load Capabilities...");
		
		$.ajax({
			url: url,
			dataType: "xml",
			success: function(xml){
				$list.parent().unmask(); $formArea.unmask();
				
				// create the processes panel
				manageCapabilities($(xml));
			},
			error: function(xhr) {
				$list.parent().unmask(); $formArea.unmask();
				if (options.errorHandler==null) {
					if (xhr.status==500) 
						displayError("ERROR","Error on the WPS server (500). Please contact the administrator.");
					else if (xhr.status==404)
						displayError("ERROR","WPS server not found or not ready (404). Please contact the administrator.");
					else
						displayError("ERROR","WPS Client generic error. Please contact the administrator.");
				} else
					options.errorHandler(xhr);	
				
				/*
				var errorMsgs = wpsParseRequestErrors(xhr.responseText), msg="<ul>";
				$.each(errorMsgs, function(){
					msg += "<li>"+this+"</li>";
				});
				msg+="</ul>";
				displayError("ERROR","Error on the application.xml<br/><br/>Error messages:<br/>"+msg);
				*/
					
			},
		});	
	}

	function manageCapabilities($xml) {
		var processes = [], ns = options.ns;
		$xml.findNsURI(ns.wps, "Process").each(function(){
			var title = $(this).findNsURI(ns.ows, "Title").text();
			var id = $(this).findNsURI(ns.ows, "Identifier").text();
			processes.push({id: id, title: title});
		});
		processes.sort(function(p1, p2){
			var t1 = p1.title.toLowerCase();
			var t2 = p2.title.toLowerCase();		
			return (t1<t2) ? -1 : ((t1>t2) ? 1 : 0);
		});
		
		// read processes
		var $ul = $("<ul>");
		
		$.each(processes, function(){
			var process = this,
				describeUrl = options.baseUrl + "?service=wps&version="+options.wpsVersion+"&request=DescribeProcess&identifier="+process.id,
				$a = $("<a href='#' class='selectAlgorithm'>"	+ process.title + "</a>").click(function(){
					algorithmSelected(process.id, process.title, describeUrl);
					return false;
				});
			var $describeProcessLink = $("<a class='wpsClient-link' href='"+describeUrl+"' target='_blank'><i class='icon-external-link'></i> ")
					.tooltip({
						html: true,
						title: "Open DescribeProcess<br/>XML request",
						placement: "bottom",
					});
			
			$ul.append($("<li>")
				.append($describeProcessLink)
				.append($a));
		});
		
	/*	$xml.find("wps_Process").each(function(){
			var title = $(this).find("ows_Title").text();
			var id = $(this).find("ows_Identifier").text();
			var $li = $("<li><a href='#' class='selectAlgorithm'>"	+ title	+ "</a></li>");
			$li.find("a").click(function(){
				algorithmSelected(id, title);
				return false;
			});
			$ul.append($li);
		});*/

		$list.append($ul);
	}

	function algorithmSelected(id, title, describeUrl) {
		hideLastJobView();
		$formArea.show().mask("Load Info of \"" + title + "\" Algorithm...");

		loadXmlFromUrl(
			describeUrl,
			function($xml) {
				$formArea.unmask();			
				showAlgorithmForm(id, title, describeUrl, $xml);
			}
		);

	}

	function showAlgorithmForm(id, title, describeUrl, $xml) {
		hideLastJobView();
		//window.$xml=$xml;
		var $processDescription = $xml.find("ProcessDescription"),
			$div = $formArea.empty()
			.append("<h4>" + $processDescription.findNsURI(options.ns.ows, "Title").first().text() + "</h4>")
			.append("<blockquote><p>" +
					$processDescription.findNsURI(options.ns.ows, "Abstract").first().text() +
				"</p></blockquote>");

		var $form = $("<form>");
		$div.append($form);

		$xml.find("DataInputs > Input").each(function(){
			showAlgorithmField($form, $(this));
		});
		var responseDocument = $xml.find("ProcessOutputs > Output").first().findNsURI(options.ns.ows,"Title").text();
		console.log("responseDocument",responseDocument);

		var $submitButton = $(
				"<div class='btn-group'>" +
				"	<a id='runAsync' href='javascript://' class='btn btn-info'>" +
				"		<i class='icon-play-sign'></i>&nbsp;&nbsp;Run Process" +
				"	</a>" +
				"	<a class='btn btn-info dropdown-toggle' data-toggle='dropdown' href='#'>" +
				"		<span class='caret'></span>" +
				"	</a>" +
				"	<ul class='dropdown-menu'>" +
				"		<li><a id='runSync' tabindex='-1' href='javascript://'>" +
				"		<i class='icon-play-circle'></i>&nbsp;&nbsp;Run in Sync mode" +
				"		</a></li>" +
				"	</ul>" +
				"</div>");
		$submitButton.find("#runAsync").click(function(){
			return algorithmSubmit(id, title, responseDocument, false);
		});
		$submitButton.find("#runSync").click(function(){
			return algorithmSubmit(id, title, responseDocument, true);
		});
		
		var $showUrlButton = $("<a href='#' class='btn'><i class='icon-link'></i>&nbsp;&nbsp;Show WPS Url request</a>").click(function(){
			var //base = (options.baseUrl.startsWith("http") ? "" : (window.location.origin + window.location.pathname).replace("client2.html","").replace("client.html","")),
				formData = getDataFromForm(id, responseDocument),
				urlSync = formData.urlSync,
				urlAsync = formData.urlAsync;
			bootbox.alert(
				"<br/><p><strong>Async Url Request</strong><br/>" + 
					"<input type='text' id='urlAsync' onclick='selectInputText(this);' " +
					"style='width:500px' value='" + urlAsync + "'>" +
				"</p>" +
				"<p><strong>Sync Url Request</strong><br/>" +
					"<input type='text' id='urlSync' onclick='selectInputText(this);' " +
					"style='width:500px' value='" + urlSync + "'>" +
				"</p>"
			);
			return false;
		});;
		var $openUrlButton = $("<a href='#' target='_blank' class='btn'><i class='icon-external-link'></i>&nbsp;&nbsp;Open WPS Url</a>").click(function(){
			var url = getDataFromForm(id, responseDocument).urlAsync;
			$(this).attr("href", url);
			return true;
		});
		$form.append("<br/><br/>")
			.append($submitButton)
			.append("&nbsp;&nbsp;")
			.append($("<div class='btn-group'>").append($showUrlButton).append($openUrlButton))
			.submit(function(){			
				return algorithmSubmit(id, title, responseDocument, false);
		});
	}

	function showAlgorithmField($form, $fieldXml) {
		var ns = options.ns,
			title = $fieldXml.findNsURI(ns.ows, "Title").text(),
			name = $fieldXml.findNsURI(ns.ows, "Identifier").text(),
			description = $fieldXml.findNsURI(ns.ows, "Abstract").text(),
			minOccurs = $fieldXml.attr("minOccurs"),
			maxOccurs = $fieldXml.attr("maxOccurs"),
			$allowedValues = $fieldXml.findNsURI(ns.ows, "AllowedValues").findNsURI(ns.ows, "Value");

		$form.append("<label class='formLabel'>"+ title +"</label>");
		
		var $field = null;
		// check if we have a finite set of allowed values
		if ($allowedValues.length>0){
			$field = $("<select>");
			$allowedValues.each(function(){
				$field.append("<option>"+$(this).text()+"</option>");
			});
		} else				
			$field = $("<input type='text' />");
		
		$field.attr({
			id: "field_" + name,
			name: name,
		});
		
		// adding popover
		if (description!=null && description!="" && description!=name)
			$field.popover({
				trigger: 'focus',
				placement: 'top',
				title: name,
				content: description,
			});

		if (maxOccurs==1) {
			// non-multiple field
			$form.append($field);
		} else if (maxOccurs>1){
			// multiple field
			var fieldset = $("<fieldset id='fieldset_" + name + "' name='" + name + "'></fieldset>");
			fieldset.append($field);
			$form.append(fieldset);

			fieldset.EnableMultiField({
				linkText: '',
				removeLinkText: '',
				confirmOnRemove: false,
				maxItemsAllowedToAdd: maxOccurs-1,
			});
		}
	}

	function algorithmSubmit(id, title, responseDocument, isSync) {
		var formData = getDataFromForm(id, responseDocument),
			url = (isSync ? formData.urlSync : formData.urlAsync),
			ns = options.ns,
			job = createJob(id, title, isSync, formData),
			n = data.jobs.push(job);
		
		// retrieve the inserted element (CHECKME: different from original?)
		job = data.jobs[n-1];

		$("body").mask(isSync ? "Running " + title + ".<br/>It can take some minutes..." : "Submitting " + title + "...");
		loadXmlFromUrl(
				url,
				function($xml) {
					$("body").unmask();
					
					if (isSync) {
						// if sync is already terminated
						job.attr({status: Status.SUCCESS, isTerminated:true, xml: $xml});
						
						// show results
						showResult(job);
						
					} else { // async mode
						
						// get status location
						var statusLocation = $xml.findNsURI(ns.wps, "ExecuteResponse").attr("statusLocation");
						if (statusLocation==null) {
							job.attr({status: Status.ERROR, isTerminated:true, xml: $xml});
							showResult(job);
							return;
						}
						
						// for eclipse testing
						if (options.statusLocationPrefix!=null)
							statusLocation = statusLocation.replace("wps/RetrieveResultServlet", options.statusLocationPrefix);
						
//						if (window.location.pathname=="/WpsHadoop_trunk/client.html")
//							statusLocation = statusLocation.replace("wps/RetrieveResultServlet", "WpsHadoop_trunk/RetrieveResultServlet");
							
						job.attr({
							status: Status.RUNNING,
							statusLocation: statusLocation,
						});
						showResult(job);
					}				
				}
		);
		return false;
	}

	function showJob(job) {
		// deactivate the form view
		$formArea.hide();
		
		hideLastJobView();
		
		// activate the view for this job
		job.attr("active", true);

		// set the current job
		data.currentJob = job;
	}

	function showResult(job) {
		// show job if the view is not active
		if (job.attr("active")==false) {
			// switch to the job view
			hideLastJobView();
			job.attr("active", true);
		}
		
		// set the new job view
		data.currentJob = job;
		
		// show possibly results
		var $xml = job.attr("xml"),
			$div = $formArea.show();
		
		if ($xml==null) {		
			$div.empty();
			return;
		}


		var	$streamingOutput = $xml.find("streamingOutput"),
			jobId = $streamingOutput.find("jobId").text(),			
			outputType = null;
		
		var $executions = $streamingOutput.find("executionResult");
		if ($executions.length>0)
			outputType = data.outType.WPS_HADOOP;
		else
			if ($xml.findNsURI(options.ns.wps, "ProcessOutputs").findNsURI(options.ns.ows, "Identifier").text()=="Metalink")
				outputType = data.outType.METALINK;
			
		if (job.status==Status.SUCCESS){
			$div.empty().append("<h4>Job Results</h4>");
			if (outputType==data.outType.WPS_HADOOP) {
				$div.append(
					"<dl class='dl-horizontal'>" +
					"	<dt>Job Id</dt><dd>" + jobId + "</dd>" +
					"	<dt>Executed Tasks</dt><dd>" + ($executions.length==0 ? 1 : $executions.length) + "</dd>" +
					"</dl>"
				);
				// executions results, shown only when job succeeded
				$executions.each(function(i){
					var $inputData = $(this).children("inputData"),
						$outputData = $(this).children("outputData");
	
					$div.append("<br /><h4>Execution " + (i+1) + "</h4>");
	
					if ($inputData) {
						var url = $inputData.children("url").text();
						var $inputDataCodeBlock = $("<pre></pre>");
						
						if ($inputData.attr("data-msg")==null)
							$.ajax({url: url}).done(function(msg) {
								$inputDataCodeBlock.html(msg);
								$inputData.attr("data-msg", msg);
							});
						else
							$inputDataCodeBlock.html($inputData.attr("data-msg"));
						
						$div.append("<p>Input Data:</p>")
						$div.append($inputDataCodeBlock);
	//					$div.append("<a href='" + url + "' target='_blank'>Input Data</a> <br />");
					}
					$div.append("<p>Outputs:</p>")
					$outputData.children("url").each(function() {
						var url = $(this).text(),
							$urlFileElement = getUrlFileElement(url);
						$div.append($urlFileElement);
					});
	
					$div.append("<br />");
				});
			} else if (outputType == data.outType.METALINK) {
				var url = $xml.findNsURI(options.ns.wps, "ProcessOutputs").findNsURI(options.ns.wps, "Data").text();
				$div.append(
					"<dl class='dl-horizontal'>" +
					"	<dt>Output Type</dt><dd>Metalink</dd>" +
					"	<dt>Metalink Url</dt><dd><a href='"+url+"' target='_blank'><i class='icon-external-link'></i> '"+url+"</a></dd>" +
					"</dl>"
				);
				$div.append("<p>Outputs:</p>");
				var $outDiv = $("<div style='min-height:50px'>").appendTo($div);
				$outDiv.mask("Loading metalink...");				
				$.get(url, function(metalink){
					$outDiv.unmask();
					$outDiv.css({"min-height": "initial", "overflow-x":"scroll"});
					$(metalink).find("file").each(function(){
						var fileName = $(this).attr("name"),
							fileUrl = $(this).find("resources url").text(),
							$fileElement = getUrlFileElement(fileUrl, fileName);
						$outDiv.append($fileElement);
						console.log(fileName, fileUrl);
					});

				}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
					$outDiv.unmask();
					$outDiv.append("<i class='icon-exclamation'></i> Unable to load metalink.");
					console.log(XMLHttpRequest, textStatus, errorThrown);
				});
			}
			
		} else if (job.status==Status.ERROR){
			$div.empty().append(
				"<div class='alert alert-block alert-error'>" + 
				"	<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
				"	<h4><i class='icon-exclamation-sign'></i> Exception</h4>" +
					$xml.findNsURI(options.ns.ows, 'ExceptionText').text()  +
				"</div>"
			);
		}
		
		
		// print the xml result
		
		$divXmlResult = $("<div style='margin-top:20px'></div>");
		$showXmlButton = $("<a href='#' class='btn btn-small'>Show the XML result.</a>");
		$showXmlButton.click(function(){
			var xmlString = "";
			if (window.ActiveXObject){ 
				xmlString = $xml.xml; 
			} else {
				var oSerializer = new XMLSerializer(); 
				xmlString = oSerializer.serializeToString($xml[0]);
			}
			$divXmlResult.html($("<pre class='prettyprint xmlResult'>").text(formatXml(xmlString)));
			prettyPrint();
			return false;
		});
		$divXmlResult.append($showXmlButton);
		$div.append($divXmlResult);

	}

	function wpsParseRequestErrors(res, token) {
		if (token==null)
			var token = " -- ";
		var split = res.split(token),
			messages = [];
		
		$.each(split, function(i){
			if (i>0)
				messages.push(this.substring(0, this.indexOf("\n")));
		});
		return messages;
	}


	function loadXmlFromUrl(url, successCallback, errorCallback) {
		$.ajax({
			url: url,
			dataType: "xml",
			success: function(xml){
				// for cross browser compatibility
				//text = text.replace(/wps:/g, "wps_");
				//text = text.replace(/ows:/g, "ows_");
				//var xmlDoc = $.parseXML(text);
				successCallback($(xml));
			},
			error: function(xhr) {
				if (options.errorHandler==null) {
					if (xhr.status==500) 
						displayError("ERROR","Error on the WPS server (500). Please contact the administrator.");
					else if (xhr.status==404)
						displayError("ERROR","WPS server not found or not ready (404). Please contact the administrator.");
					else
						displayError("ERROR","WPS Client generic error. Please contact the administrator.");
				} else
					options.errorHandler(xhr);	
			},
		});	
	}

	function getDataFromForm(id, responseDocument) {
		// get all form values as parameters
		var wpsParameters = "",
			ris = { parameters: [] };
		
		$formArea.find("form > input, form > select").each(function(){
			var name = $(this).attr("name");
			//name = name.replace(/^field_/, '');
			var value = $(this).val();

			if (value!=null && value!="") {
				wpsParameters += name + "=" + encodeURIComponent(value) + ";";
				ris.parameters.push( { name: name, value: value } );
			}
		});

		$formArea.find("form > fieldset").each(function(){		
			var name = $(this).attr("name");
			var values = "";

			$(this).find("input, select").each(function(){
				//name = name.replace(/^field_/, '');
				var value = $(this).val();

				if (value!=null && value!="") {
					wpsParameters += name + "=" + encodeURIComponent(value) + ";";
					values += " "+value+";";
				}
			});
			ris.parameters.push( { name: name, value: values } );
		});

		ris.urlSync = options.baseUrl + "?service=wps&version="+options.wpsVersion +
		"&request=Execute&identifier="+id +
		"&dataInputs="+wpsParameters +
		"&ResponseDocument="+responseDocument;
		
		ris.urlAsync = ris.urlSync + "&storeExecuteResponse=true&status=true";

		return ris;
	}

	function hideLastJobView() {
		// deactivate the view for the last viewed job (if exists)
		if (data.currentJob!=null)
			data.currentJob.attr("active", false);
	}

	function getUrlFileElement(url, text) {
		// try to take the filename and the extension
		var fileName = null;
		fileName = (text == null ? url.substring(url.lastIndexOf('/')+1) : text);
		
		var extension = null;
		if (fileName!=null && fileName!="")
			extension = fileName.substring(fileName.lastIndexOf('.')+1);

		var imgFileName = "file.png";
		switch(extension) {
		case "png": imgFileName = "file.png"; break;
		case "txt": imgFileName = "txt.gif"; break;
		case "csv": imgFileName = "csv.gif"; break;
		case "shp": imgFileName = "shp.png"; break;
		}

		return $("<a class='fileUrl' href='" + url + "' target='_blank'>"
				+ "<img src='images/fileIcons/" + imgFileName + "' />&nbsp;" 
				+ fileName + "</a><br/>");
	}

	function formatXml(xml) {
		var formatted = '';
		var reg = /(>)(<)(\/*)/g;
		xml = xml.replace(reg, '$1\r\n$2$3');
		var pad = 0;
		jQuery.each(xml.split('\r\n'), function(index, node) {
			var indent = 0;
			if (node.match( /.+<\/\w[^>]*>$/ )) {
				indent = 0;
			} else if (node.match( /^<\/\w/ )) {
				if (pad != 0) {
					pad -= 1;
				}
			} else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
				indent = 1;
			} else {
				indent = 0;
			}

			var padding = '';
			for (var i = 0; i < pad; i++) {
				padding += '  ';
			}

			formatted += padding + node + '\r\n';
			pad += indent;
		});

		return formatted;
	}
	
	
	function displayError(type, msg){
		$formArea.empty().show();
		$formArea.html("" +
			"<div class='alert alert-block alert-error'>" + 
			"	<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
			"	<h4><i class='icon-exclamation-sign'></i> "+type+"</h4>" +
				msg  +
			"</div>"
		);
	}

	
	////////////
	//  MAIN  //
	////////////
	
	// set options
	var options = $.extend(WpsClient.defaultOptions, options),
		$mainDiv = $(this),
		data = {
			jobs: new can.Observe.List([]),
			jobNames: [],	
			url: options.baseUrl + "?service=wps&version="+options.wpsVersion+"&request=getCapabilities",
			outType: {
				WPS_HADOOP: 0,
				METALINK: 1,
			}
		};
	
	// create html content
	$mainDiv.empty()
	.append(""
			+"	<div class='row-fluid'>"
			+"		<div class='span4 wpsClient-roundedArea wpsClient-panel'>"
			+"			<div>"
			+"				<input class='checkboxPolling' type='checkbox' checked='checked' value='true' style='display:none'/>"
			+"				<h4><i class='icon-list-alt'></i> Process List <a class='wpsClient-link' href='"+data.url+"' target='_blank'><i class='icon-external-link'></i> (GetCapabilities)</a></h4>"
			+"				<div class='algorithmList'></div>"
			+"				<p><i class='icon-refresh'></i> <a href='javascript://' class='reload'>Reload</a></p>"
			+"			</div>"
			+"			<br />"
			+"			<div class='lastJobsResults'></div>"
			+"			<div class='lastJobsResults2'></div>"
			+"		</div>"
			+"		<div class='span8 wpsClient-roundedArea wpsClient-panel'>"
			+"			<div class='jobDetailsArea'></div>"
			+"			<div class ='algorithmFormArea'></div>"
			+"		</div>"
			+"	</div>"
	);
	$mainDiv.find(".wpsClient-link").tooltip({
		html: true,
		title: "Open GetCapabilities<br/>XML request",
	});
	var $list = $mainDiv.find(".algorithmList"),
	$formArea = $mainDiv.find(".algorithmFormArea"),
	$jobDetails = $mainDiv.find(".jobDetailsArea"),
	$lastJobs = $mainDiv.find(".lastJobsResults");
	$mainDiv.find(".reload").click(function(){
		startWpsWebClient();
	});
	
	if (options.baseUrl==null){
		displayError("ERROR", "'baseUrl' option is mandatory");
		return this;
	}

	console.log("BASE URL: "+options.baseUrl);
	
	
	prettyPrint();
    Notificator.init({
        "selector": ".bb-alert"
    });
    
    startWpsWebClient();
    
    this.reload = function(){
    	startWpsWebClient();
    };

    return this;
};

})(jQuery);


// A simple notificator
var Notificator = (function() {
    "use strict";

    var elem,
        hideHandler,
        that = {};

    that.init = function(options) {
        elem = $(options.selector);
    };

    that.show = function(text) {
        clearTimeout(hideHandler);

        elem.find("span").html(text);
        elem.fadeIn();

        hideHandler = setTimeout(function() {
            that.hide();
        }, 4000);
    };

    that.hide = function() {
        elem.fadeOut();
    };

    return that;
}());
