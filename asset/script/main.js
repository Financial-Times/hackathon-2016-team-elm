(function() {
	'use strict';

	// Setup
	initComponents(document.body, {
		article: createArticleComponent
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

	// Create an article
	function createArticleComponent(element) {
		var component = {

			init: function() {
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
							paragraph.innerHTML = paragraph.innerHTML.replace(entity.name, [
								'<a ',
									'href="#', slugify(entity.name) , '" ',
									'data-component="entity-link"',
									'data-entity-json="', JSON.stringify(entity).replace(/"/g, '&quot;') , '"',
								'>',
									entity.name,
								'</a>'
							].join(''));
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

	// Create an entity link
	function createEntityLinkComponent(element) {
		var component = {

			init: function() {
				component.entity = component.getEntityData();
				component.bindEvents();
			},

			bindEvents: function() {
				element.addEventListener('click', component.onClick);
			},

			onClick: function(event) {
				alert(
					'Work in progress! Here\'s the data for this entity:\n' +
					JSON.stringify(component.entity, null, 4)
				);
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

}());
