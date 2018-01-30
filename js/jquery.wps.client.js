/*

 JQuery WPS Client - By Ceras

 dependencies:
 	- canjs 1.1.6
	- jquery.loadmask
	- prettyprint
	- font-awesome
	- bootstrap
	- bootbox
	- jquery.multiFieldExtender
	- jquery.namespace
	
*/

WpsClient = {
	version: "1.2.1",
	defaultOptions: {
		libPath: "imports/js/jquery.wps.client",
		//baseUrl: MANDATORY
		wpsVersion: "1.0.0",
		ns: {
			wps: "http://www.opengis.net/wps/1.0.0",
			ows:"http://www.opengis.net/ows/1.1"
		},
		errorHandler: null,
		pollingTime: 3000,
		joblistServiceUrl: null, 
		/* it can be null or a joblist service url */
	},
	Status: {
		PENDING: 'PENDING',
		RUNNING: 'RUNNING',
		SUCCESS: 'SUCCESS',
		ERROR: 'ERROR',
		TO_CHECK: 'TO_CHECK',
		TO_REMOVE: 'TO_REMOVE',
	},
	extensions: {
		
	}
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
	
	this.setupCan = function(){
		// set canjs view extension to nothing for extensionless view filenames
		can.view.ext = '';
		// set mustache as default template engine for can.view
		can.view.types[''] = can.view.types['.mustache'];
		can.mustache.registerHelper('ifEquals', function(value, valueCheck, options) {
			var v = (value==null || typeof(value)!='function' ? value : value());
			var vc = (valueCheck==null || typeof(valueCheck)!='function' ? valueCheck : valueCheck());
			return (v===vc ? options.fn() : null);
		});
		
		can.mustache.registerHelper('ifInOffset', function(index, offset, limit, options){
			var index = (index==null || typeof(index)!='function' ? index : index()),
				offset = (offset==null || typeof(offset)!='function' ? offset : offset()),
				limit = (limit==null || typeof(limit)!='function' ? limit : limit());
			return ((index>=offset && index<offset+limit) ? options.fn() : null);
		});
		
		can.mustache.registerHelper('showPagination', function(offset, limit, n){
			var offset = (offset==null || typeof(offset)!='function' ? offset : offset()),
				limit = (limit==null || typeof(limit)!='function' ? limit : limit()),
				n = (n==null || typeof(n)!='function' ? n : n()),
				nPages = Math.ceil(n/limit),
				ris = '';
			
			if (nPages>1){
				var pageNumber = 0;
				for (var i=0; i<n; i+=limit)
					if (i==offset)
						ris += '<span class="pageCircle">'+(++pageNumber)+'</span>';
					else
						ris += '<a class="changePage pageCircle" href="javascript://" data-offset="' + i + '">'+(++pageNumber)+'</a>'
//					if (i==offset)
//						ris += '<i class="icon-circle"></i>';
//					else
//						ris += '<a class="changePage" href="javascript://" data-offset="' + i + '"><i class="icon-circle-blank"></i></a>'
			}
			
			return new can.mustache.safeString(ris);
			
		});
		
		
		can.mustache.registerHelper('paginationBox', function(offset, limit, n) {
			
			var n = n();
			var pageOffset = 0;
			var offset = offset();
			var limit = limit();
			var page = Math.floor(offset/limit);
			var np = totalPages = Math.ceil(n/limit);
			var ePage = page + 1 -pageOffset; // effective page shown to user, from 1 to np
			
			if (totalPages<=1)
				return '';
			
			var hasFirst, hasPrevDots, has2Prev, hasPrev, hasNext, has2Next, hasNextDots, hasLast;
			
			if (ePage>1) 	hasPrev = true;
			if (ePage>2)	has2Prev = true;
			if (ePage>3)	hasFirst = true;
			if (ePage>4)	hasPrevDots = true;
			
			if (ePage<np)   hasNext = true;
			if (ePage<np-1) has2Next = true;
			if (ePage<np-2) hasLast = true;
			if (ePage<np-3) hasNextDots = true;
			
			var html = //'totalResults='+totalResults+', pageOffset='+pageOffset+', page='+page+', count='+count+
				'<ul class="pagination paginationBox">';
			if (hasPrev)
				html+= '<li><a data-page="'+(page-1)+'" class="changePage" href="#">Prev</a></li>';
			if (hasFirst)
				html+= '<li><a data-page="'+pageOffset+'" class="changePage" href="#">1</a></li>';
			if (hasPrevDots)
				html+= '<li><a href="#" class="disabled">...</a></li>';
			if (has2Prev)
				html+= '<li><a data-page="'+(page-2)+'" class="changePage" href="#">' + (ePage-2) + '</a></li>';
			if (hasPrev)
				html+= '<li><a data-page="'+(page-1)+'" class="changePage" href="#">' + (ePage-1) + '</a></li>';
			html+= '<li class="active"><a href="#">'+(ePage)+'</a></li>';
			if (hasNext)
				html+= '<li><a data-page="'+(page+1)+'" class="changePage" href="#">' + (ePage+1) + '</a></li>';
			if (has2Next)
				html+= '<li><a data-page="'+(page+2)+'" class="changePage" href="#">' + (ePage+2) + '</a></li>';
			if (hasNextDots)
				html+= '<li><a href="#" class="disabled">...</a></li>';
			if (hasLast)
				html+= '<li><a data-page="'+(np+pageOffset-1)+'" class="changePage" href="#">' + (np) + '</a></li>';
			if (hasNext)
				html+= '<li><a data-page="'+(page+1)+'" class="changePage" href="#">Next</a></li>';
			html+= '</ul>';
			
			return html;
		});	


	};
	
	function startWpsWebClient() {
		
		data.jobs = new can.Observe.List([]);
		data.pagination = new can.Observe({offset:0, limit:5});
		data.jobNames = [];
		
		data.jobDetailsData = new can.Observe({ currentJob: null });
		
		console.log("BASE URL", options.baseUrl);
		
		// create control for jobs list
		JobsControl = can.Control({
			init: function(element, opt){
				
				this.jobsData = new can.Observe({
					jobs: data.jobs,
					pagination: data.pagination
				});
				this.jobDetailsData = new can.Observe({})
				
				$(element).html(can.view(options.libPath + "/views/jobsList.html", this.jobsData));
				$jobDetails.html(can.view(options.libPath + "/views/jobDetails.html", data.jobDetailsData));
			},
			"a.selectJob click": function(elem, event){
				var jobId = elem.data("jobid");
				var jobs = this.jobsData.jobs;
				
				var search = jobs.filter(function(j){return (j.jobId==jobId)});
				if (search.length)
					showResult(search[0]);
			},
			"a.changePage click": function(elem, event){
				var page = $(elem).data('page');
				var offset = page*5;
				data.pagination.attr('offset', offset);
				
//				if ($(elem).data("offset")!=null)
//					data.pagination.attr("offset", $(elem).data("offset"));
			}
		});
		//WWCConf.jobsControl = 
		data.jobsControl = new JobsControl($lastJobs, {});
		
		loadCapabilities(data.url);
		
		if (options.joblistServiceUrl)
			getJobListFromService();
		
		checkStatusPolling();
	}
	
	function getJobListFromService(list){
		
		// load the list
		if (!list){
			$.get(options.joblistServiceUrl, function(json){
				// sort by date descending
				json.sort(function(a,b){
					return b.Value.localeCompare(a.Value);
				});
				getJobListFromService(json);
			});
			return;
		}
		
		// if the list is an array or is empty, stop
		if (!$.isArray(list) || list.length==0)
			return;
		
		$.each(list, function(){
			var jobId = this.Key;
			
			// get the retrieve result servlet url
			var retrieveResultServletUrl = (options.retrieveResultServletUrl ? options.retrieveResultServletUrl : 
				options.baseUrl.replace("/WebProcessingService","/RetrieveResultServlet"));
			
			// get the status location for the jobId
			var statusLocation = retrieveResultServletUrl + "?id=" + jobId;
			
			// add the job
			data.jobs.push({
				jobName: "...",
				isSync: false,
				active: false,
				statusLocation: statusLocation,
				status: WpsClient.Status.TO_CHECK,
				jobId: jobId,
			});

		});
		
		updateLastJobsFromPageView();
		data.pagination.bind('change', function(ev, attr, how, newVal, oldVal){
			updateLastJobsFromPageView();
		});
		
	}
	
	function updateLastJobsFromPageView(){
		var offset = data.pagination.offset,
			limit = data.pagination.limit,
			reload=false;
		
		$.each(data.jobs, function(i){
			var job = this;
			
			if (i<offset || i>offset+limit-1 || job.status!=WpsClient.Status.TO_CHECK)
				return true;
			
			$.get(job.statusLocation, function(result, status, jqXHR){
				var ns = options.ns;
				var $result = $(result);
				var time = new Date($result.findNsURI(ns.wps, "Status").attr("creationTime"));
				var title = $result.findNsURI(ns.wps, "Process").findNsURI(ns.ows, "Title").text() + ' ' + time.toISOString();
				var id = $result.findNsURI(ns.ows, "Identifier").text();
				var jobName = getJobName(title);
				var status, isTerminated, xml, percent;
				
				// if process succeeded
				if ($result.findNsURI(ns.wps, "ProcessSucceeded").length) {
					status = WpsClient.Status.SUCCESS;
					isTerminated = true;
					xml = $result;
				}
				
				// if process failed
				else if ($result.findNsURI(ns.wps, "ProcessFailed").length) {
					status = WpsClient.Status.ERROR;
					isTerminated = true;
					xml  = $result;
				}
				
				// if process is yet running
				else if ($result.findNsURI(ns.wps, "ProcessStarted").length){
					status = WpsClient.Status.RUNNING;
					var $processStarted = $result.findNsURI(ns.wps, "ProcessStarted"),
						percentCompleted = $processStarted.attr("percentCompleted");
					percent = (percentCompleted==null ? $processStarted.text() : percentCompleted);
				} else {
					// generic error (CHECKME: maybe not need it)
					status = WpsClient.Status.ERROR;
					isTerminated = true;
					xml  = null;
				}
				
				console.log("---JOB "+job.jobId+" ADDED");
				
				job.attr({
					id: id,
					title: title,
					jobName: jobName,
					time: time,
					status: status,
					isTerminated: isTerminated,
					xml: xml,
					percent: percent,
				});

				
			}).fail(function(){
				console.log("---JOB "+job.jobId+" NOT ADDED");
				data.jobs.splice(i, 1);

				updateLastJobsFromPageView();
				console.log("--RELOAD");
			});
			
		});
	};

	function getJobName(title){
		// create an unique jobName
		var jobName = title;
		if (data.jobNames[title]==null)
			data.jobNames[title]=1;
		else
			jobName += " ("+(data.jobNames[title]++)+")";
		return jobName;
	}
	
	function checkStatusPolling() {
		setInterval(function(){
			if ($mainDiv.find(".checkboxPolling").is(':checked'))
				updateStatus();
		}, options.pollingTime);
	}

	function updateStatus(){
		$.each(data.jobs, function(i, job){
			var ns = options.ns;
			
			var isInsidePage = (i>=data.pagination.offset && i<data.pagination.offset+data.pagination.limit);
			var isActive = (job.attr('active')==true);
			var isRunning = (job.status==WpsClient.Status.RUNNING);
			
			// check the status only if:
			// 1) the job is async;
			// 2) the statusLocation is set;
			// 3) the status is RUNNING;
			// 4) the job is inside the current page view OR the job is active

			if (!job.isSync && job.statusLocation && isRunning && (isInsidePage || isActive)){
				$.get(job.statusLocation, function(result, status, jqXHR) {
					var $result = $(result);
					
					// if process succeeded
					if ($result.findNsURI(ns.wps, "ProcessSucceeded").length>0) {
						job.attr( { status:WpsClient.Status.SUCCESS, isTerminated:true, xml:$result } );
						Notificator.show("Job " + job.attr("jobName") + " succeeded");
						if (job.attr('active'))
							showResult(job);
					}
					
					else if ($result.findNsURI(ns.wps, "ProcessFailed").length>0) {
						job.attr( { status:WpsClient.Status.ERROR, isTerminated:true, xml:$result } );
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
		
		// create a uuid
		var jobId = '';
		for (i=0; i<20; i++)
			jobId += String.fromCharCode(65 + Math.floor(Math.random() * 26));
		
		return new can.Observe({
			jobId: jobId,
			id: id,
			jobName: jobName,
			title: title,
			status: WpsClient.Status.PENDING,
			percent: 0,
			isSync: isSync,
			isTerminated: false,
			time: new Date(),
			active: false,
			parameters: formData.parameters,
			url: formData.url,
			executions: [],
		});
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

		var $form = $("<form>").appendTo($div);

		if (WpsClient.extensions[id] && WpsClient.extensions[id].form){
			// manual mode
			var formContent = WpsClient.extensions[id].form,
				$formContent = (typeof(formContent)=='function' ? formContent($xml) : $(formContent));
			$form.append($formContent);
			// adding popover
			$form.find(".wpsInput-text, .wpsInput-select").each(function(){
				$(this).popover({
					trigger: 'focus',
					placement: 'top',
				});
			});
		} else {
			// automatic mode
			$xml.find("DataInputs > Input").each(function(){
				showAlgorithmField($form, $(this));
			});
		}

		showOutputSelector($form, $xml);
		
//		var responseDocument = $xml.find("ProcessOutputs > Output").first().findNsURI(options.ns.ows,"Identifier").text();
//		console.log("responseDocument",responseDocument);

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
			return algorithmSubmit(id, title, false);
		});
		$submitButton.find("#runSync").click(function(){
			return algorithmSubmit(id, title, true);
		});
		
		var $showUrlButton = $("<a href='#' class='btn'><i class='icon-link'></i>&nbsp;&nbsp;Show WPS Url request</a>").click(function(){
			//var base = (options.baseUrl.startsWith("http") ? "" : (window.location.origin + window.location.pathname).replace("client2.html","").replace("client.html","")),
			var formData = getDataFromForm(id);
			var urlSync = formData.urlSync;
			var urlAsync = formData.urlAsync;
			var $alertContent = $(
				'<br/><p><strong>Async Url Request</strong><br/>' + 
					'<input type="text" id="urlAsync" onclick="selectInputText(this);" style="width:500px">' +
				'</p>' +
				'<p><strong>Sync Url Request</strong><br/>' +
					'<input type="text" id="urlSync" onclick="selectInputText(this);" style="width:500px">' +
				'</p>'
			);
			
			$alertContent.find('#urlAsync').val(urlAsync);
			$alertContent.find('#urlSync').val(urlSync);
			
				
			bootbox.alert($alertContent);
			return false;
		});
		var $openUrlButton = $("<a href='#' target='_blank' class='btn'><i class='icon-external-link'></i>&nbsp;&nbsp;Open WPS Url</a>").click(function(){
			var url = getDataFromForm(id).urlAsync;
			$(this).attr("href", url);
			return true;
		});
		$form.append("<br/><br/>")
			.append($submitButton)
			.append("&nbsp;&nbsp;")
			.append($("<div class='btn-group'>").append($showUrlButton).append($openUrlButton))
			.submit(function(){			
				return algorithmSubmit(id, title, false);
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

		// get default value
		var defaultValue = $fieldXml.find("LiteralData > DefaultValue").text();

		$form.append("<label class='formLabel'>"+ title +"</label>");
		
		var $field = null;
		// check if we have a finite set of allowed values
		if ($allowedValues.length>0){
			$field = $("<select class='wpsInput-select'>");
			$allowedValues.each(function(){
				var value = $(this).text();
				if(defaultValue != null && defaultValue == value)
					$field.append("<option selected='selected'>"+value+"</option>");
				else
					$field.append("<option>"+value+"</option>");
			});
		} else{
			$field = $('<input type="text" class="wpsInput wpsInput-text" />');
			if (defaultValue != null)
				$field.val(defaultValue);
		}				
		
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
			var fieldset = $("<fieldset id='fieldset_" + name + "' name='" + name + "' class='wpsInput-multiField'></fieldset>");
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
	
	function showOutputSelector($form, $xml){
		var WPS = options.ns.wps, OWS = options.ns.ows;
		
		// get the response document
		var responseDocument = {};
		$xml.find("ProcessOutputs > Output").each(function(){
			var identifier = $(this).findNsURI(OWS,"Identifier").text();
			var title = $(this).findNsURI(OWS,'Title').text();
			var mimeTypes = $(this).find("ComplexOutput > Supported > Format > MimeType").map(function(){return $(this).text()});
			var defaultMimeType = $(this).find("ComplexOutput > Default > Format > MimeType").text();
			responseDocument[identifier] = {
				identifier: identifier,
				title: title,
				mimeTypes: mimeTypes,
				defaultMimeType: defaultMimeType
			}
		});

		var $selector = $('<div class="responseDocument">');
		$form.append('<br/><hr/><p>Outputs</p>', $selector, '<hr/>');
		
		// for each response output
		$.each(responseDocument, function(){
			var identifier = this.identifier;
			var title = this.title;
			if (this.mimeTypes && this.mimeTypes.length>0){
				var defaultmimetype = this.defaultMimeType;
				$.each(this.mimeTypes, function(){
					var $label = $('<label class="checkbox"> ' + title + ' (' + this + ')</label>');
					var $checkbox = $('<input type="checkbox" value="' + identifier + '@mimeType=' + this + '"/>')
						.appendTo($label);
					if(this == defaultmimetype) $checkbox.prop('checked', true);

//					if (identifier==Config.opensearchResultIdentifier){
//						$checkbox.prop('checked', true).prop('disabled', true);
//						$selector.prepend($label);
//					} else
					$selector.append($label);
					//$select.append('<option value="">'+title+' ('+this+')</option>');
				});
				
			} else
				$selector.append('<label class="checkbox" value="' + identifier + '"><input type="checkbox"> ' + title + '</label>');
		});
	}

	function algorithmSubmit(id, title, isSync) {
		var formData = getDataFromForm(id),
			url = (isSync ? formData.urlSync : formData.urlAsync),
			ns = options.ns,
			job = createJob(id, title, isSync, formData);
		
		data.jobs.unshift(job);
		
//			n = data.jobs.push(job);
//		
//		// retrieve the inserted element (CHECKME: different from original?)
//		job = data.jobs[n-1];

		$("body").mask(isSync ? "Running " + title + ".<br/>It can take some minutes..." : "Submitting " + title + "...");
		loadXmlFromUrl(
				url,
				function($xml) {
					$("body").unmask();
					
					if (isSync) {

						job.attr({
							status: ($xml.findNsURI(ns.wps, "ProcessFailed").length ? WpsClient.Status.ERROR : WpsClient.Status.SUCCESS),
							isTerminated:true,
							xml: $xml
						});
						
						// show results
						showResult(job);
						
					} else { // async mode
						
						// get status location
						var statusLocation = $xml.findNsURI(ns.wps, "ExecuteResponse").attr("statusLocation");
						if (statusLocation==null) {
							job.attr({status: WpsClient.Status.ERROR, isTerminated:true, xml: $xml});
							showResult(job);
							return;
						}
						
						// for eclipse testing
						if (options.statusLocationPrefix!=null)
							statusLocation = statusLocation.replace("wps/RetrieveResultServlet", options.statusLocationPrefix);
						
//						if (window.location.pathname=="/WpsHadoop_trunk/client.html")
//							statusLocation = statusLocation.replace("wps/RetrieveResultServlet", "WpsHadoop_trunk/RetrieveResultServlet");
							
						job.attr({
							status: WpsClient.Status.RUNNING,
							statusLocation: statusLocation,
						});
						showResult(job);
					}				
				}
		);
		return false;
	}

	function showResult(job) {
		var WPS = options.ns.wps, OWS = options.ns.ows;
		var currentJob = data.jobDetailsData.currentJob;
		
		// check if already have the current job active
		if (currentJob && currentJob.jobId==job.jobId)
			return;
			
		// deactivate the previous job (if exists)
		if (currentJob) 
			currentJob.attr('active', false);
		
		// activate the job to show
		job.attr("active", true);
		
		// set the new job view (and the new current job)
		data.jobDetailsData.attr('currentJob', job);
		
		// show possibly results
		var $xml = job.attr("xml"),
			$div = $formArea.empty().show();
		
		if (!$xml) return;
		
		if (job.status==WpsClient.Status.SUCCESS){
			// iterate outputs
			var $outputs = $xml.findNsURI(WPS, "ProcessOutputs").findNsURI(WPS, "Output");
			$.each($outputs, function(){
				var $output = $(this);
				var outputTitle = $output.findNsURI(OWS, "Title").text();
				
				// get the output type
				var	$streamingOutput = $output.find("streamingOutput");
				var jobId = $streamingOutput.find("jobId").text();		
				var outputType;
				var $executions = $streamingOutput.find("executionResult");
				if ($executions.length>0)
					outputType = data.outType.WPS_HADOOP;
				else if ($output.findNsURI(WPS, "ComplexData").findNsURI(WPS, "Reference").attr("mimeType")=="application/metalink4+xml")
					outputType = data.outType.METALINK;
				else if ($output.findNsURI(OWS, "Identifier").text()=="Metalink")
					outputType = data.outType.METALINK_OLD;
				else if ($output.findNsURI(WPS, "ComplexData").findNsURI(WPS, "Reference").length)
					outputType = data.outType.REFERENCE;
				
				// show current output				
				$div.append('<hr/><h4>Job Results: <i>'+outputTitle+'</i></h4>');				
				if (outputType==data.outType.WPS_HADOOP) {
					$div.append(
							"<dl class='dl-horizontal'>" +
							"	<dt>Job Id</dt><dd>" + jobId + "</dd>" +
							"	<dt>Executed Tasks</dt><dd>" + ($executions.length==0 ? 1 : $executions.length) + "</dd>" +
							"</dl>"
					);
					// executions results, shown only when job succeeded
					$executions.each(function(i){
						var $inputData = $(this).children("inputData");
						var $outputData = $(this).children("outputData");
						
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
				} else if (outputType == data.outType.METALINK || outputType == data.outType.METALINK_OLD) {
					var $data = $output.findNsURI(WPS, "Data");
					var url = (outputType == data.outType.METALINK ? $data.findNsURI(WPS, "Reference").attr("href") : $data.text());
					$div.append(
							'<dl class="dl-horizontal">' +
							'	<dt>Output Type</dt><dd>Metalink</dd>' +
							'	<dt>Metalink Url</dt><dd><a href="'+url+'" target="_blank"><i class="icon-external-link"></i> '+url+'</a></dd>' +
							'</dl>'
					);
					$div.append("<p>Outputs:</p>");
					var $outDiv = $("<div style='min-height:50px'>").appendTo($div);
					$outDiv.mask("Loading metalink...");				
					$.get(url, function(metalink){
						$outDiv.unmask();
						$outDiv.css({"min-height": "initial", "overflow-x":"scroll"});
						var $files = $(metalink).find("file");
						if ($files.length)
							$files.each(function(){
								var fileName = $(this).attr("name"),
								fileUrl = $(this).find("resources url").text(),
								$fileElement = getUrlFileElement(fileUrl, fileName);
								$outDiv.append($fileElement);
								console.log(fileName, fileUrl);
							});
						else
							$outDiv.append('<i class="icon-info-sign"></i> Metalink files not found.');
						
					}).fail(function(XMLHttpRequest, textStatus, errorThrown) {
						$outDiv.unmask();
						$outDiv.append("<i class='icon-exclamation'></i> Unable to load metalink.");
						console.log(XMLHttpRequest, textStatus, errorThrown);
					});
				} else if (outputType == data.outType.REFERENCE){
					var $ref = $output.findNsURI(WPS, "Data").findNsURI(WPS, "Reference");
					$div.append(
							'<dl class="dl-horizontal">' +
							'	<dt>Output Type</dt><dd>Reference</dd>' +
							'	<dt>MimeType</dt><dd>'+$ref.attr("mimeType")+'</dd>' +
							'	<dt>Url</dt><dd><a href="'+$ref.attr('href')+'" target="_blank"><i class="icon-external-link"></i> '+$ref.attr('href')+'</a></dd>' +
							'</dl>'
					);
				}
			});
			
		} else if (job.status==WpsClient.Status.ERROR){
			$div.empty().append(
				"<div class='alert alert-block alert-error'>" + 
				"	<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
				"	<h4><i class='icon-exclamation-sign'></i> Exception</h4>" +
					$xml.findNsURI(OWS, 'ExceptionText').text()  +
				"</div>"
			);
		}
		
		// print the xml result
		
		var $divXmlResult = $("<div style='margin-top:20px'><hr/></div>"),
			$showXmlButton = $("<a href='#' class='btn btn-small'>Show the XML result.</a>").appendTo($divXmlResult),
			$xmlResult = $("<div>").appendTo($divXmlResult).hide();
		
		// prettyprint
		var xmlString = "";
		if (window.ActiveXObject){ 
			xmlString = $xml.xml; 
		} else {
			var oSerializer = new XMLSerializer(); 
			xmlString = oSerializer.serializeToString($xml[0]);
		}
		$xmlResult.html($("<pre class='prettyprint xmlResult'>").text(formatXml(xmlString)));
		
		$showXmlButton.click(function(){
			$showXmlButton.text(($xmlResult.css("display")=="none" ? "Hide": "Show") +  " the XML result.");
			$xmlResult.toggle();
			prettyPrint();
			return false;
		});
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

	function getDataFromForm(id) {
		// get all form values as parameters
		var wpsParameters = "",
			ris = { parameters: [] };
		
		// multifield
		$formArea.find("form > .wpsInput-multiField").each(function(){		
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

		// text fields inputs and select (excluding multifield)
		$formArea.find("form input.wpsInput-text:not('form>.wpsInput-multiField input.wpsInput-text'), " +
				"form textarea.wpsInput-text:not('form>.wpsInput-multiField textarea.wpsInput-text'), " +
				"form select.wpsInput-select:not('form>.wpsInput-multiField select.wpsInput-select')").each(function(){
			var name = $(this).attr("name");
			//name = name.replace(/^field_/, '');
			var value = $(this).val();

			if (value!=null && value!="") {
				wpsParameters += name + "=" + encodeURIComponent(value) + ";";
				ris.parameters.push( { name: name, value: value } );
			}
		});

		// radio group inputs
		$formArea.find("form .wpsInput-radioGroup").each(function(){
			var $selectedRadio = $(this).find("input[type='radio']:checked"),
				name = $selectedRadio.attr("name"),
				value = $selectedRadio.val();				
			if (value!=null && value!="") {
				wpsParameters += name + "=" + encodeURIComponent(value) + ";";
				ris.parameters.push( { name: name, value: value } );
			}
		});
		
		// checkboxes inputs
		$formArea.find("form input.wpsInput-checkbox").each(function(){
			var $checkbox = $(this),
				name = $checkbox.attr("name"),
				checkedValue = ($checkbox.data('checked-value') ? $checkbox.data('checked-value') : true),
				uncheckedValue = ($checkbox.data('unchecked-value') ? $checkbox.data('unchecked-value') : false),
				value = $checkbox.prop('checked') ? checkedValue : uncheckedValue;
						
			wpsParameters += name + "=" + encodeURIComponent(value) + ";";
			ris.parameters.push( { name: name, value: value } );
		});
		
		// get outputs
		var outputs = $formArea
				.find('.responseDocument input[type="checkbox"]:checked')
				.map(function(){ return $(this).val() })
				.get();
		var responseDocument = outputs.join(';');		
		
		ris.urlSync = options.baseUrl + "?service=wps&version="+options.wpsVersion +
		"&request=Execute&identifier="+id +
		"&dataInputs="+wpsParameters +
		"&ResponseDocument="+ responseDocument;
		
		ris.urlAsync = ris.urlSync + "&storeExecuteResponse=true&status=true";

		return ris;
	}

	function hideLastJobView() {
		// deactivate the view for the last viewed job (if exists)
		if (data.jobDetailsData.currentJob){
			data.jobDetailsData.currentJob.attr('active', false);
			data.jobDetailsData.removeAttr('currentJob');
		}
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
		case "png": imgFileName = "png.gif"; break;
		case "tiff": imgFileName = "tiff.gif"; break;
		case "txt": imgFileName = "txt.gif"; break;
		case "csv": imgFileName = "csv.gif"; break;
		case "shp": imgFileName = "shp.png"; break;
		}

		return $("<a class='fileUrl' href='" + url + "' target='_blank'>"
				+ "<img src='" + options.libPath + "/img/" + imgFileName + "' />&nbsp;" 
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
				METALINK_OLD: 1,
				METALINK: 2,
				REFERENCE: 3
			}
		};
	
	window.data = data;
	window.options = options;
	
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
	
	var self = this;
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
    
	this.setupCan();
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
