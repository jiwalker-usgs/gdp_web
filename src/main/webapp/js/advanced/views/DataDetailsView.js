/*jslint browser: true*/
/*global _,jQuery*/
var GDP = GDP || {};
(function(_, $){
    "use strict";
    GDP.ADVANCED= GDP.ADVANCED || {};
    GDP.ADVANCED.view = GDP.ADVANCED.view || {};
	var variablePicker  = {
		selector : '#data-source-vars'
    };
	var datePickers = {
		start : {
			selector:'#start-date'
		},
		end : {
			selector: '#end-date'
		}
	};
	var urlPicker = {
		selector: '#data-source-url'
	};

	var VARIABLE_WPS_PROCESS_ID = 'gov.usgs.cida.gdp.wps.algorithm.discovery.ListOpendapGrids';
	var DATE_RANGE_WPS_PROCESS_ID = 'gov.usgs.cida.gdp.wps.algorithm.discovery.GetGridTimeRange';
    
    GDP.ADVANCED.view.DataDetailsView = GDP.util.BaseView.extend({
	'events' : (function(){
		var ret = {};
		ret['change ' + variablePicker.selector] = 'setSelectedVariables';
		ret['change ' + urlPicker.selector] = 'setUrl';
		ret['changeDate ' + datePickers.start.selector] = 'setStartDate';
		ret['changeDate ' + datePickers.end.selector] = 'setEndDate';
		return ret;
	}()),
	'wps' : null,
	'initialize': function(options) {
	    this.wps = options.wps;
	    this.wpsEndpoint = options.wpsEndpoint;
	    //super
		GDP.util.BaseView.prototype.initialize.apply(this, arguments);
		$(urlPicker.selector).val(this.model.get('dataSourceUrl'));
		this.listenTo(this.model, 'change:dataSourceUrl', this.changeUrl);
		this.listenTo(this.model.get('dataSourceVariables'), 'reset', this.changeAvailableVariables);
		this.listenTo(this.model, 'change:invalidDataSourceUrl', this.changeInvalidUrl);
		this.listenTo(this.model, 'change:minDate', this.changeMinDate);
		this.listenTo(this.model, 'change:maxDate', this.changeMaxDate);
		this.listenTo(this.model, 'change:startDate', this.changeStartDate);
		this.listenTo(this.model, 'change:endDate', this.changeEndDate);
		
		this.changeAvailableVariables();
		this.changeInvalidUrl();
		this.changeMinDate();
		this.changeMaxDate();
		this.changeStartDate();
		this.changeEndDate();
	},
	'setEndDate' : function(ev){
		this.model.set('endDate', ev.target.value);
	},
	'setStartDate' : function(ev){
		this.model.set('startDate', ev.target.value);
	},
	'setMaxDate' : function(ev){
		this.model.set('maxDate', ev.target.value);
	},
	'setMinDate' : function(ev){
		this.model.set('minDate', ev.target.value);
	},
	'setUrl' : function(ev){
		this.model.set('dataSourceUrl', ev.target.value);
	},
	'changeMinDate' : function(){
		var minDate = this.model.get('minDate');
		$(datePickers.start.selector).datepicker('setStartDate', minDate);
	},
	'changeMaxDate' : function(){
		var maxDate = this.model.get('maxDate');
		$(datePickers.end.selector).datepicker('setEndDate', maxDate);
	},
	'changeStartDate' : function(){
		var startDate = this.model.get('startDate');
		if(null === startDate){
			$(datePickers.start.selector).datepicker('clearDates');
		}
		else{
			$(datePickers.start.selector).datepicker('setDate', startDate);
			$(datePickers.end.selector).datepicker('setStartDate', startDate);
		}
	},
	'changeEndDate' : function(){
		var endDate = this.model.get('endDate');
		if(null === endDate){
			$(datePickers.end.selector).datepicker('clearDates');
		}
		else{
			$(datePickers.end.selector).datepicker('setDate', endDate);
			$(datePickers.start.selector).datepicker('setEndDate', endDate);
		}
	},
	'selectMenuView' : null,
	'render' : function () {
		this.$el.html(this.template());
		this.selectMenuView = new GDP.util.SelectMenuView({
				el : variablePicker.selector,
				emptyPlaceholder : false,
				sortOptions: false
		});
		$(datePickers.start.selector).datepicker();
		$(datePickers.end.selector).datepicker();
		return this;
	},
	'dateModelProperties' : ['minDate', 'startDate', 'maxDate', 'endDate'],
	'resetDates': function(){
		var self = this;
		_.each(this.dateModelProperties, function(dateProp){
			self.model.set(dateProp, null);
		});
	},
	'setSelectedVariables' : function (ev) {
		var variables = _.map(ev.target.options, function (option) {
				return {
					'text': option.text,
					'value': option.value,
					'selected': option.selected
				};
			});
			
		var dataSourceVariables = this.model.get('dataSourceVariables');
		
		dataSourceVariables.set(variables);
	},
	/**
	 * On model change, updates the dom to reflect the current data source's 
	 * available variables in <option> elements in a <select>
	 * @returns {undefined}
	 */
	'changeAvailableVariables' : function(){
		var dataSourceVariables = this.model.get('dataSourceVariables');
		var plainObjects = _.pluck(dataSourceVariables.models, 'attributes');
		this.selectMenuView.updateMenuOptions(plainObjects);
	},
	'changeInvalidUrl' : function(){
		var invalidUrl = this.model.get('invalidDataSourceUrl');
		var selectorsToToggleDisabled = [
			datePickers.start.selector,
			datePickers.end.selector,
			variablePicker.selector
		];
		
		_.each(selectorsToToggleDisabled, function(selector){
			$(selector).prop('disabled', invalidUrl);
		});
	},
	/**
	 * Reacts to a change in url
	 * 
	 * @param {GDP.ADVANCED.model.JobModel} 
	 * @param {String} url 
	 * @returns {jQuery.Deferred.promise} The promise is resolved with no args 
	 * if user cleared the url or if user submitted a url and all subesequent 
	 * web service calls succeded. The promise is rejected with an error message
	 * if any web service calls fail, or if the web service responses cannot be
	 * parsed.
	 */
	'changeUrl': function (jobModel, url) {
		var self = this,
		deferred = $.Deferred();
		if (!(_.isNull(url) || _.isUndefined(url) || _.isEmpty(url))) {
			this.getGrids(url).done(function(catalogUrl, gridName){
				var dateRangePromise = self.getDateRange(catalogUrl, gridName);
				dateRangePromise.then(function(){
					deferred.resolve.apply(this, arguments);
				}, function(){
					deferred.reject.apply(this, arguments);
				});
			}).fail(function(){
				deferred.reject.apply(this, arguments);
			});
		} else {
			//user is just clearing the url, no need for web service calls
			deferred.resolve();
		}
		self.model.set('invalidDataSourceUrl', true);
		self.model.get('dataSourceVariables').reset();
		self.resetDates();
		return deferred.promise();
	},
	'failedToParseVariableResponseMessage' : "No variables were discovered at this data source url.",
	/**
	 * Gets the variables present in a url. 
	 * 
	 * @param {String} dataSourceUrl
	 * @returns {jQuery.Deferred.promise} The promise is resolved with args 
	 * ({String} data source url, {String} variable name) when the web service call 
	 * succeeds. The promise is rejected with one arg ({String} error message) 
	 * if the web service calls fail or their responses cannot be parsed.
	 */
	'getGrids': function (dataSourceUrl) {
		var self = this,
				variables =[],
				deferred = $.Deferred(),
				wpsInputs = {
					"catalog-url": [dataSourceUrl],
					"allow-cached-response": ["true"]
				},
		wpsOutput = ["result_as_json"];

		this.wps.sendWpsExecuteRequest(
				this.wpsEndpoint + '/WebProcessingService',
				VARIABLE_WPS_PROCESS_ID,
				wpsInputs,
				wpsOutput,
				false,
				null,
				true,
				'json',
				'application/json'
				).done(function (response, textStatus, message) {
			var invalid = true;
			if (response.datatypecollection && response.datatypecollection.types && response.datatypecollection.types.length > 0) {
				variables = _.map(response.datatypecollection.types, function (type) {
					var text = type.name + ' - ' + type.description + ' (' + type.unitsstring + ")";
					var value = type.name;
					return {
						'text': text,
						'value': value,
						'selected': false
					};
				});
				invalid = false;
				deferred.resolve(dataSourceUrl, variables[0].value);
			}
			else {
				//todo: anything better than 'alert'
				var message = self.failedToParseVariableResponseMessage;
				alert(message);
				deferred.reject(message);
			}
			self.model.get('dataSourceVariables').reset(variables);
			self.model.set('invalidDataSourceUrl', invalid);
		}).fail(function (jqxhr, textStatus, message) {
			//todo: anything better than 'alert'
			alert(message);
			self.model.set('invalidDataSourceUrl', true);
			self.model.get('dataSourceVariables').reset();
			deferred.reject(message);
		}).always(function () {
		});
		return deferred.promise();
	},
	'hasExpectedNumericProperties' : function(obj, expectedProperties){
		var hasExpectedNumericProperties = true;
		if (_.isObject(obj)) {
			var picked = _.pick(obj, expectedProperties);
			if(_.keys(picked).length !== expectedProperties.length){
				hasExpectedNumericProperties = false;
			}
			else {
				var valuesAreNumeric = _.chain(picked).values().every(_.isNumber).value();
				if(!valuesAreNumeric){
					hasExpectedNumericProperties = false;
				}
			}
		}
		else{
			hasExpectedNumericProperties = false;
		}
		return hasExpectedNumericProperties;
	},
	'isValidDateRangeResponse' : function(response){
		var expectedProperties = ['year','month','day'],
		hasAvailableTimes = false,
		validStartTime = false,
		validEndTime = false,
		isDefined = !!response;
		if(isDefined){
			hasAvailableTimes = !!response.availabletimes;
			if(hasAvailableTimes){
				validStartTime = this.hasExpectedNumericProperties(response.availabletimes.starttime, expectedProperties),
				validEndTime = this.hasExpectedNumericProperties(response.availabletimes.endtime, expectedProperties);
			}
		}
		return isDefined && hasAvailableTimes && validStartTime && validEndTime;
	},
	'failedToParseDateRangeResponseMessage' : 'Could not determine date range for selected data source',
	/**
	 * Retrieves the date range for a given data source and variable. Updates
	 * the model with the retrieved values.
	 * 
	 * @param {String} dataSourceUrl
	 * @param {String} variableName
	 * @returns {jQuery.Deferred.promise} The promise is resolved with no args
	 * when the web service call completes successfully. The promise is rejected
	 * with an error message if the web service calls fail or the responses
	 * cannot be parsed.
	 */
	'getDateRange': function(dataSourceUrl, variableName){
		var self = this,
			deferred = $.Deferred(),
			wpsInputs = {
				"catalog-url": [dataSourceUrl],
				"allow-cached-response": ["true"],
				"grid": [variableName]
			},
			wpsOutput = ["result_as_json"];
		
		this.wps.sendWpsExecuteRequest(
			this.wpsEndpoint + '/WebProcessingService',
			DATE_RANGE_WPS_PROCESS_ID,
			wpsInputs,
			wpsOutput,
			false,
			null,
			true,
			'json',
			'application/json'
		).done(function (response, textStatus, message) {
			var minDate,
				maxDate,
				invalid = true;
			if (self.isValidDateRangeResponse(response)){
				var minObj = response.availabletimes.starttime,
					maxObj = response.availabletimes.endtime;
				//service month index is 1-based. JS month index is 0-based
				minDate = new Date(minObj.year, minObj.month - 1, minObj.day);
				maxDate = new Date(maxObj.year, maxObj.month -1, maxObj.day);
				invalid = false;
			}
			else {
				//todo: anything better than 'alert'
				var message = self.failedToParseDateRangeResponseMessage;
				alert(message);
				deferred.reject(message);
			}
			self.model.set('minDate', minDate);
			self.model.set('startDate', minDate);
			self.model.set('maxDate', maxDate);
			self.model.set('endDate', maxDate);
			self.model.set('invalidDataSourceUrl', invalid);
			deferred.resolve();
		}).fail(function (jqxhr, textStatus, message) {
			//todo: anything better than 'alert'
			alert(message);
			self.model.set('minDate', null);
			self.model.set('maxDate', null);
			self.model.set('invalidDataSourceUrl', true);
			deferred.reject(message);
		}).always(function () {
		});
		return deferred.promise();
	}
});

}(_, jQuery));
