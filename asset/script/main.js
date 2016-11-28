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
			var templateSource = templateElement.innerHTML;
			templates[templateName] = Handlebars.compile(templateSource);
		});
		return templates;
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
					component.paragraphs.forEach(function(paragraph) {
						// Find entities within the paragraph
						entities.forEach(function(entity) {
							var render = templates['entity-link']({
								entity: entity,
								json: JSON.stringify(entity)
							});
							paragraph.innerHTML = paragraph.innerHTML.replace(entity.name, render);
						});
						// Initialise components for the new entities
						initComponents(paragraph, {
							'entity-link': createEntityLinkComponent
						})
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
				document.addEventListener('ft.teach', component.onTeachEvent);
			},

			onTeachEvent: function(event) {
				var entity = event.detail.entity;
				component.innerElement.innerHTML = templates.entity(event.detail.entity);
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
