define([
  '../core',
  '../modules/ajax',
  '../modules/Events',
  './clonePrototype'
], function (blocks, ajax, Events, clonePrototype) {
  /**
   * @namespace View
   */
  function View(application, parentView, prototype) {
    var _this = this;
    var options = this.options;
    var views = this._views = [];

    clonePrototype(prototype, this);

    this._application = application;
    this._parentView = parentView || null;
    this._initCalled = false;
    this._html = undefined;

    this.loading = blocks.observable(false);
    this.isActive = blocks.observable(!options.route);
    this.isActive.on('changing', function (oldValue, newValue) {
      blocks.each(views, function (view) {
        if (!view.options.route) {
          view.isActive(newValue);
        }
      });
      _this._tryInitialize(newValue);
    });

    if (options.preload || this.isActive()) {
      this._load();
    }
  }

  View.prototype = {
    /**
     * Override the init method to perform actions when the View is first created
     * and shown on the page
     *
     * @memberof View
     * @type {Function}
     *
     * @example {javascript}
     * var App = blocks.Application();
     *
     * App.View('Statistics', {
     *   init: function () {
     *     this.loadRemoteData();
     *   },
     *
     *   loadRemoteData: function () {
     *     // ...stuff...
     *   }
     * });
     */
    init: blocks.noop,

    /**
     * Override the routed method to perform actions when the View have routing and routing
     * mechanism actives it.
     *
     * @memberof View
     * @type {Function}
     *
     *
     * @example {javascript}
     * var App = blocks.Application();
     *
     * App.View('ContactUs', {
     *   options: {
     *     route: 'contactus'
     *   },
     *
     *   routed: function () {
     *     alert('Navigated to ContactUs page!')
     *   }
     * });
     */
    routed: blocks.noop,

    parentView: function () {
      return this._parentView;
    },

    /**
     * Routes to a specific URL and actives the appropriate views associated with the URL
     *
     * @memberof View
     * @param {String} name -
     * @returns {View} - Chainable. Returns this
     *
     * @example {javascript}
     * var App = blocks.Application();
     *
     * App.View('ContactUs', {
     *   options: {
     *     route: 'contactus'
     *   }
     * });
     *
     * App.View('Navigation', {
     *   navigateToContactUs: function () {
     *     this.route('contactus')
     *   }
     * });
     */
    route: function (/* name */ /*, ...params */) {
      this._application._history.navigate(blocks.toArray(arguments).join('/'));
      return this;
    },

    navigateTo: function (view, params) {
      this._application.navigateTo(view, params);
    },

    _tryInitialize: function (isActive) {
      if (!this._initialized && isActive) {
        if (this.options.url && !this._html) {
          this._callInit();
          this._load();
        } else {
          this._initialized = true;
          this._application._initializingView = this;
          this._callInit();
          this._application._initializingView = null;
          if (this.isActive()) {
            this.isActive.update();
          }
        }
      }
    },

    _routed: function (params) {
      this._tryInitialize(true);
      this.routed(params);
      blocks.each(this._views, function (view) {
        if (view.isActive()) {
          view._routed(params);
        }
      });
      this.isActive(true);
    },

    _callInit: function () {
      if (this._initCalled) {
        return;
      }

      var key;
      var value;

      blocks.__viewInInitialize__ = this;
      for (key in this) {
        value = this[key];
        if (blocks.isObservable(value)) {
          value.__context__ = this;
        }
      }
      this.init.apply(this, this._initArgs);
      blocks.__viewInInitialize__ = undefined;
      this._initCalled = true;
    },

    _load: function () {
      var url = this.options.url;
      if (url && !this.loading()) {
        this.loading(true);
        ajax({
          url: url,
          success: blocks.bind(this._loaded, this),
          error: blocks.bind(this._error, this)
        });
      }
    },

    _loaded: function (html) {
      this._html = html;
      this._tryInitialize(true);
      this.loading(false);
    },

    _error: function () {
      this.loading(false);
    }
  };

  Events.register(View.prototype, ['on', 'off', 'trigger']);
});