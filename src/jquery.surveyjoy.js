// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

	"use strict";

		// undefined is used here as the undefined global variable in ECMAScript 3 is
		// mutable (ie. it can be changed by someone else). undefined isn't really being
		// passed in so we can ensure the value of it is truly undefined. In ES5, undefined
		// can no longer be modified.

		// window and document are passed through as local variable rather than global
		// as this (slightly) quickens the resolution process and can be more efficiently
		// minified (especially when both are regularly referenced in your plugin).

		// Create the defaults once
		var pluginName = "Surveyjoy",
			defaults = {
				surveyData: null,
				surveyContainerTpl: "<div class='sj-container'><div class='sj-content'></div><div class='sj-actionbar'></div></div>",
				titlePageTpl: "<div class='sj-titlepage'><h2 class='sj-title'>{{ title }}</h2><p class='sj-body'>{{ body }}</p></div>",
				thanksPageTpl: "<div class='sj-titlepage'><h2 class='sj-title'>{{ title }}</h2><p class='sj-body'>{{ body }}</p></div>",
				freeResponseTpl: "<div class='sj-question freeresponse'><h2 class='sj-title'>{{ title }}</h2><p class='sj-subtitle'>{{ subtitle }}</p><textarea name='{{ id }}' placeholder='{{ placeholder }}' /></div>",
				startButtonTpl: "<button class='sj-btn start' href='javascript:void(0)'>Start</button>",
				thanksButtonTpl: "<button class='sj-btn thanks' href='javascript:void(0)'>Thanks</button>",
				nextButtonTpl: "<button class='sj-btn next' href='javascript:void(0)'>Next</button>",
				skipButtonTpl: "<button class='sj-btn skip' href='javascript:void(0)'>Skip</button>",
				defaultSurvey: {
					titlePage: {},
					thanksPage: {},
					questions: []
				},
				defaultQuestion: {
					required: false
				}
			};

		// The actual plugin constructor
		function Surveyjoy ( element, options ) {
				console.log("Constructor called");
				console.dir(this);

				this.element = element;
				this.$element = $(element);

				// jQuery has an extend method which merges the contents of two or
				// more objects, storing the result in the first object. The first object
				// is generally empty as we don't want to alter the default options for
				// future instances of the plugin
				this.settings = $.extend( {}, defaults, options );

				this._defaults = defaults;
				this._name = pluginName;


				this.$surveyEl = null;
				this.$innerEl = null;
				this.currentSurvey = null;
				this.currentSurveyPage = null;

				this.init();
		}

		// Avoid Surveyjoy.prototype conflicts
		$.extend(Surveyjoy.prototype, {
				init: function () {
						if(typeof this.settings.surveyData === "object") {
							this._onLoadedSurveyData(this.settings.surveyData);
						}
						else {
							// TODO: Load via ajax
						}
				},
				test: function () {
						// some logic
						console.log("Test function");
				},

				_onLoadedSurveyData: function(surveyData) {
					this.settings.surveyData = surveyData;

					console.log("Loaded survey data");
					console.dir(this.settings.surveyData);

					// Set defaults for questions & surveys
					var newSurveys = {};
					$.each(this.settings.surveyData.surveys, $.proxy(function(surveyId, survey) {
						var newSurvey = $.extend({}, this.settings.defaultSurvey, survey);

						var questions = newSurvey.questions;
						newSurvey.questions = [];

						$.each(questions, $.proxy(function(pageId, page) {
							var newPage = $.extend({}, this.settings.defaultQuestion, page);

							newSurvey.questions.push(newPage);
						}, this));

						newSurveys[surveyId] = newSurvey;
					}, this));

					this.settings.surveyData.surveys = newSurveys;
				},

				trigger: function(surveyId) {
					// Shows a particular survey
					console.log("Triggering survey", surveyId);
					console.dir(this);

					this.currentSurvey = this.settings.surveyData.surveys[surveyId];
					this.currentSurveyPage = null;

					this._showSurveyContainer();
					this._showPage();
				},

				_showSurveyContainer: function() {
					this.$surveyEl = $(this.settings.surveyContainerTpl);
					this.$contentEl = this.$surveyEl.find(".sj-content");
					this.$actionEl = this.$surveyEl.find(".sj-actionbar");

					this.$element.append(this.$surveyEl);
				},

				_advancePage: function() {
					var nextPage = null;

					if(this.currentSurveyPage === null) {
						nextPage = 'titlePage';
					}
					else if(this.currentSurveyPage === 'thanksPage') {
						nextPage = null;
					}
					else {
						if(this.currentSurveyPage === 'titlePage') {
							nextPage = -1;
						}

						nextPage ++;

						if(nextPage >= this.currentSurvey.questions.length) {
							nextPage = 'thanksPage';
						}
					}

					this.currentSurveyPage = nextPage;
				},

				_showPage: function() {
					this._advancePage();

					if(this.currentSurveyPage === null) {
						return this._endSurvey();
					}

					var $newInnerEl = this._renderPage(this.currentSurveyPage);
					var $actionButtons = this._renderActionButtons(this.currentSurveyPage);

					if(this.$innerEl) {
						this.$innerEl.remove();
						this.$innerEl = null;
					}

					this.$actionEl.empty();

					this.$innerEl = $newInnerEl;
					this.$contentEl.append(this.$innerEl);
					this.$actionEl.append($actionButtons);

					this._listenPageEvents(this.currentSurveyPage);
				},

				_renderActionButtons: function(pageId) {
					var actionButtons = this._getPageActionButtons(pageId);

					var els = [];

					for(var idx in actionButtons) {
						var buttonId = actionButtons[idx];

						console.log("Adding button: " + buttonId);

						els.push(this._renderActionButton(buttonId));
					}

					return els;
				},

				_renderActionButton: function(buttonId) {
					var $btn;

					if(buttonId === 'start') {
						$btn = $(this.settings.startButtonTpl);

						$btn.on('click', $.proxy(this._showPage, this));
					}
					else if(buttonId === 'thanks') {
						$btn = $(this.settings.thanksButtonTpl);

						$btn.on('click', $.proxy(this._endSurvey, this));
					}
					else if(buttonId === 'skip') {
						$btn = $(this.settings.skipButtonTpl);

						$btn.on('click', $.proxy(this._showPage, this));
					}
					else if(buttonId === 'next') {
						$btn = $(this.settings.nextButtonTpl);

						$btn.on('click', $.proxy(this._showPage, this));
					}

					return $btn;
				},

				_getPageActionButtons: function(pageId) {
					if(pageId === 'titlePage') {
						return ['start'];
					}
					else if(pageId === 'thanksPage') {
						return ['thanks'];
					}
					else {
						var page = this._getPage(pageId);

						if(!page.required) {
							return ['skip', 'next'];
						}
						else {
							return ['next'];
						}
					}
			    },

				_renderPage: function(pageId) {
					if(pageId === 'titlePage') {
						return this._renderTitlePage();
					}
					else if(pageId === 'thanksPage') {
						return this._renderThanksPage();
					}
					else {
						return this._renderQuestion(pageId);
					}
				},

				_renderTitlePage: function() {
					var page = this.currentSurvey.titlePage;

					var html = this._renderTpl(this.settings.titlePageTpl, page);

					return $(html);
				},

				_renderThanksPage: function() {
					var page = this.currentSurvey.thanksPage;

					var html = this._renderTpl(this.settings.thanksPageTpl, page);

					return $(html);
				},

				_renderQuestion: function(pageId) {
					var page = this._getPage(pageId);
					var html;

					if(page.type === 'freeresponse') {
						html = this._renderTpl(this.settings.freeResponseTpl, page);
					}

					return $(html);
				},

				_renderTpl: function(tpl, obj) {
					$.each(obj, function(key, val) {
						tpl = tpl.replace("{{ " + key + " }}", val);
					});

					return tpl;
				},

				_getPage: function(pageId) {
					if(pageId === 'titlePage') {
						return this.currentSurvey.titlePage;
					}
					else if(pageId === 'thanksPage') {
						return this.currentSurvey.thanksPage;
					}
					else {
						return this.currentSurvey.questions[pageId];
					}
				},

				_listenPageEvents: function(pageId) {
					var page = this._getPage(pageId);

					if(page.nextTimer) {
						setTimeout($.proxy(this._showPage, this), page.nextTimer);
					}

					//if(pageId === 'titlePage') {
						//this._listenTitlePageEvents();
					//}
				},

				_listenTitlePageEvents: function() {
					//var $startButtonEl = this.$
				},

				_endSurvey: function() {
					this.$surveyEl.remove();

					this.currentSurvey = null;
					this.currentSurveyPage = null;
				}
		});

		// A really lightweight plugin wrapper around the constructor,
		// preventing against multiple instantiations
		$.fn[ pluginName ] = function ( methodOrOptions ) {
			var args = arguments;

			return this.each(function() {
				if ( !$.data( this, "plugin_" + pluginName ) ) {
					var obj = new Surveyjoy( this, methodOrOptions );
					$.data( this, "plugin_" + pluginName, obj );
				}
				else {
					var obj = $.data(this, 'plugin_' + pluginName);
					obj[methodOrOptions].apply( obj, Array.prototype.slice.call( args, 1 ));
				}
			});
		};

})( jQuery, window, document );
