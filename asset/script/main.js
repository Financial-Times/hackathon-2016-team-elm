(function() {
	'use strict';

	// Setup
	var templates;
	document.addEventListener('o.DOMContentLoaded', function() {
		initComponents(document.body, {
			article: createArticleComponent,
			popover: createPopoverComponent
		});
		templates = initTemplates(document.body);
		registerHandlebarsHelpers(Handlebars);
	});

	// Init all components
	function initComponents(rootElement, componentInitFunctions) {
		find('[data-component]', rootElement).forEach(function(componentElement) {
			var componentName = componentElement.getAttribute('data-component');
			if (componentInitFunctions[componentName]) {
				var component = componentInitFunctions[componentName](componentElement);
			}
		});
	}

	// Init all templates
	function initTemplates(rootElement) {
		var templates = {};
		find('script[type="text/x-handlebars"]', rootElement).forEach(function(templateElement) {
			var templateName = templateElement.getAttribute('name');
			var templateSource = templateElement.innerHTML.trim();
			templates[templateName] = Handlebars.compile(templateSource);
		});
		return templates;
	}

	// Register Handlebars helpers
	function registerHandlebarsHelpers(hbs) {

		Handlebars.registerHelper('switch', function(value, options) {
			this._switch_value_ = value;
			var html = options.fn(this);
			delete this._switch_value_;
			return html;
		});

		Handlebars.registerHelper('case', function(value, options) {
			if (value == this._switch_value_) {
				return options.fn(this);
			}
		});

	}

	// Create an article
	function createArticleComponent(element) {
		var component = {

			init: function() {
				component.element = element;
				component.entities = component.loadEntities(component.findTerms());
				component.paragraphs = component.findParagraphs();
				component.createEntityLinks();
			},

			findTerms: function() {
				return find('meta[name=article-term]', element)
					.map(function(termElement) {
						return termElement.getAttribute('content');
					})
					.map(slugify);
			},

			findParagraphs: function() {
				return find('p', element);
			},

			loadEntities: function(terms) {
				var entitiesUrl = find('meta[name=entities-url]')[0].getAttribute('content');
				return fetch(entitiesUrl)
					.then(function(response) {
						return response.json();
					})
					.then(function(allEntities) {
						return allEntities.filter(function(entity) {
							return terms.some(function(term) {
								if (slugify(entity.name) === term) {
									return true;
								}
							});
						});
					});
			},

			createEntityLinks: function() {
				component.entities.then(function(entities) {
					entities.forEach(function(entity) {
						var entityEvent = new CustomEvent('ft.entity', {
							detail: {
								entity: entity
							}
						});
						document.dispatchEvent(entityEvent);
					});
					component.paragraphs.forEach(function(paragraph) {
						// Find entities within the paragraph
						entities.forEach(function(entity) {
							var render = templates['entity-link']({
								entity: entity,
								json: JSON.stringify(entity)
							});
							var entityName = entity.name.replace('&', '&amp;');
							paragraph.innerHTML = paragraph.innerHTML.replace(entityName, render);
						});
						// Initialise components for the new entities
						initComponents(paragraph, {
							'entity-link': createEntityLinkComponent
						});
					});
				});
			}

		};
		component.init();
		return component;
	}

	// Create a popover component
	function createPopoverComponent(element) {
		var component = {

			init: function() {
				component.element = element;
				component.innerElement = element.querySelector('[data-role=popover-inner]');
				component.contentElement = element.querySelector('[data-role=popover-content]');
				component.openElement = element.querySelector('[data-role=popover-open]');
				component.closeElement = element.querySelector('[data-role=popover-close]');
				component.entities = [];
				component.previousScrollPosition = 0;
				document.addEventListener('scroll', component.onScrollEvent);
				document.addEventListener('ft.teach', component.onTeachEvent);
				document.addEventListener('ft.entity', component.onEntityEvent);
				document.addEventListener('ft.checklist', component.onChecklistEvent);
				component.closeElement.addEventListener('click', component.onCloseClickEvent);
				component.openElement.addEventListener('click', component.onChecklistEvent);
			},

			open: function() {
				element.classList.add('teach-popover--open');
			},

			close: function() {
				element.classList.remove('teach-popover--open');
			},

			openChecklist: function() {
				component.contentElement.innerHTML = templates['entity-checklist']({
					read: component.entities.filter(function(entity) { return entity.checked; }).length,
					total: component.entities.length,
					entities: component.entities
				});
				component.open();
			},

			onTeachEvent: function(event) {
				var entity = event.detail.entity;
				component.entities.forEach(function(ent) {
					if (ent.name === entity.name) {
						ent.checked = true;
					}
				});
				component.contentElement.innerHTML = templates.entity(event.detail.entity);
				element.classList.add('teach-popover--open');
			},

			onEntityEvent: function(event) {
				component.entities.push(event.detail.entity);
			},

			onChecklistEvent: function(event) {
				component.openChecklist();
				event.preventDefault();
			},

			onCloseClickEvent: function(event) {
				component.close();
				event.preventDefault();
			},

			onScrollEvent: function(event) {
				var scrollBottom = document.body.scrollTop + document.documentElement.clientHeight;
				if (scrollBottom > document.body.offsetHeight - 100 && component.previousScrollPosition < scrollBottom) {
					component.openChecklist();
				}
				component.previousScrollPosition = scrollBottom;
			}

		};
		component.init();
		return component;
	}

	// Create an entity link
	function createEntityLinkComponent(element) {
		var component = {

			init: function() {
				component.element = element;
				component.entity = component.getEntityData();
				component.bindEvents();
			},

			bindEvents: function() {
				element.addEventListener('click', component.onClickEvent);
			},

			onClickEvent: function(event) {
				var teachEvent = new CustomEvent('ft.teach', {
					detail: {
						entity: component.entity
					}
				});
				document.dispatchEvent(teachEvent);
				event.preventDefault();
			},

			getEntityData: function() {
				return JSON.parse(element.getAttribute('data-entity-json'));
			}

		};
		component.init();
		return component;
	}

	// Find elements by selector
	function find(selector, context) {
		context = context || document.body;
		return Array.from(context.querySelectorAll(selector));
	}

	// Slugify a string
	function slugify(string) {
		return string.trim().toLowerCase().replace(/[^a-z0-9\-]+/i, '-');
	}

	// Create an element from HTML
	function createElement(html) {
		var outer = document.createElement('div');
		outer.innerHTML = html;
		return outer.firstChild;
	}

}());
