"use strict";

/*!
 * Webp Lazy Load - jQuery plugin for lazy loading webp images
 *
 * 修改自 jquery.lazy.js，删除了一些zepto不支持的代码。
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 */

(function ($, window, document, undefined) {
  var $window = $(window);

  var __supportwebp = false;

  var __checked = false;

  var supportWebp = function supportWebp(callback) {

    if (__checked) {
      callback();
      return;
    }

    (function () {
      var webp = new Image();
      webp.onload = webp.onerror = function () {
        __checked = true;
        __supportwebp = webp.height === 2;
        webp.onload = webp.onerror = null;
        webp = null;
        callback();
      };
      //高度为2的一个webp图片
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    })();
  };

  $.fn.webp = function (options) {

    var elements = this;
    var $container;
    var settings = {
      threshold: 0,
      failure_limit: 0,
      event: "scroll",
      effect: "show",
      container: window,
      origSrc: "lsrc",
      origDir: "",
      webpDir: "",
      skip_invisible: false,
      appear: null,
      load: null,
      placeholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC"
    };

    /**
     * 先对elements进行处理，找到所以包含 origSrc 的子元素。
     */
    function adjust() {

      var _elements;

      elements.each(function () {
        var $this = $(this),
            _tmp;
        if (settings.skip_invisible && !$this.is(":visible")) {
          return;
        }
        var original = $this.attr(settings.origSrc);

        // 如果当前对象没有origSrc属性，同时当前对象不是图片节点，
        // 则查找子节点中有origSrc属性的节点，进行webp处理
        if (!original) {
          _tmp = $this.find("[" + settings.origSrc + "*=" + settings.origDir + "]");
        } else {
          _tmp = $this;
        }

        if (_elements && _elements.length > 0) {
          if ($.merge) {
            // jquery merge
            _elements = $.merge(_elements, _tmp);
          } else {
            // zepto merge
            _elements.concat(_tmp);
          }
        } else {
          _elements = _tmp;
        }
      });

      elements = _elements;
    }

    adjust();

    function update() {
      var counter = 0;

      elements.each(function () {
        var $this = $(this);
        if (settings.skip_invisible && !$this.is(":visible")) {
          return;
        }

        if ($.abovethetop(this, settings) || $.leftofbegin(this, settings)) {
          /* Nothing. */
        } else if (!$.belowthefold(this, settings) && !$.rightoffold(this, settings)) {
            $this.trigger("appear");
            /* if we found an image we'll load, reset the counter */
            counter = 0;
          } else {
            if (++counter > settings.failure_limit) {
              return false;
            }
          }
      });
    }

    if (options) {
      /* Maintain BC for a couple of versions. */
      if (undefined !== options.failurelimit) {
        options.failure_limit = options.failurelimit;
        delete options.failurelimit;
      }
      if (undefined !== options.effectspeed) {
        options.effect_speed = options.effectspeed;
        delete options.effectspeed;
      }

      $.extend(settings, options);
    }

    if (options.origDir && !options.webpDir) {
      throw new Error('option webpDir undefined!');
    }

    /* Cache container as jQuery as object. */
    $container = settings.container === undefined || settings.container === window ? $window : $(settings.container);

    /* Fire one scroll event per scroll. Not one scroll event per image. */
    if (0 === settings.event.indexOf("scroll")) {
      $container.bind(settings.event, function () {
        return update();
      });
    }

    elements.each(function () {
      var self = this;
      var $self = $(self);

      self.loaded = false;

      /* If no src attribute given use data:uri. */
      if ($self.attr("src") === undefined || $self.attr("src") === false) {
        if ($self.is("img")) {
          $self.attr("src", settings.placeholder);
        }
      }

      /* When appear is triggered load original image. */
      $self.one("appear", function () {
        if (!this.loaded) {
          if (settings.appear) {
            var elements_left = elements.length;
            settings.appear.call(self, elements_left, settings);
          }

          var original = $self.attr(settings.origSrc);

          // 替换webp目录和图片后缀
          if (__supportwebp) {
            original = original.replace(settings.origDir, settings.webpDir).replace(/\.(jpg|png|jpeg|gif)$/ig, '.webp');
          }

          $("<img />").bind("load", function () {

            $self.hide();
            if ($self.is("img")) {
              $self.attr("src", original);
            } else {
              $self.css("background-image", "url('" + original + "')");
            }
            $self[settings.effect](settings.effect_speed);

            self.loaded = true;

            /* Remove image from array so it is not looped next time. */
            var temp = $.grep(elements, function (element) {
              return !element.loaded;
            });
            elements = $(temp);

            if (settings.load) {
              var elements_left = elements.length;
              settings.load.call(self, elements_left, settings);
            }
          }).attr("src", original);
        }
      });

      /* When wanted event is triggered load original image */
      /* by triggering appear.                              */
      if (0 !== settings.event.indexOf("scroll")) {
        $self.bind(settings.event, function () {
          if (!self.loaded) {
            $self.trigger("appear");
          }
        });
      }
    });

    /* Check if something appears when window is resized. */
    $window.bind("resize", function () {
      update();
    });

    /* With IOS5 force loading images when navigating with back button. */
    /* Non optimal workaround. */
    if (/(?:iphone|ipod|ipad).*os 5/gi.test(navigator.appVersion)) {
      $window.bind("pageshow", function (event) {
        if (event.originalEvent && event.originalEvent.persisted) {
          elements.each(function () {
            $(this).trigger("appear");
          });
        }
      });
    }

    /* Force initial check if images should appear. */
    $(document).ready(function () {
      supportWebp(function () {
        update();
      });
    });

    return this;
  };

  /* Convenience methods in jQuery namespace.           */
  /* Use as  $.belowthefold(element, {threshold : 100, container : window}) */

  $.belowthefold = function (element, settings) {
    var fold;

    if (settings.container === undefined || settings.container === window) {
      fold = (window.innerHeight ? window.innerHeight : $window.height()) + $window.scrollTop();
    } else {
      fold = $(settings.container).offset().top + $(settings.container).height();
    }
    return fold <= $(element).offset().top - settings.threshold;
  };

  $.rightoffold = function (element, settings) {
    var fold;

    if (settings.container === undefined || settings.container === window) {
      fold = $window.width() + $window.scrollLeft();
    } else {
      fold = $(settings.container).offset().left + $(settings.container).width();
    }

    return fold <= $(element).offset().left - settings.threshold;
  };

  $.abovethetop = function (element, settings) {
    var fold;

    if (settings.container === undefined || settings.container === window) {
      fold = $window.scrollTop();
    } else {
      fold = $(settings.container).offset().top;
    }
    return fold >= $(element).offset().top + settings.threshold + $(element).height();
  };

  $.leftofbegin = function (element, settings) {
    var fold;

    if (settings.container === undefined || settings.container === window) {
      fold = $window.scrollLeft();
    } else {
      fold = $(settings.container).offset().left;
    }

    return fold >= $(element).offset().left + settings.threshold + $(element).width();
  };

  $.inviewport = function (element, settings) {
    return !$.rightoffold(element, settings) && !$.leftofbegin(element, settings) && !$.belowthefold(element, settings) && !$.abovethetop(element, settings);
  };

  $.extend($, {
    webp: function webp(options) {
      $(document).webp(options);
    }
  });
})($, window, document);