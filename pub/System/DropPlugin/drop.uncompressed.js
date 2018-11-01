/*
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Copyright (C) 2018 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.

*/

/* global StrikeOne:false */

"use strict";
(function($) {

  // Create the defaults once
  var defaults = {
    mime: ""
  };

  // The actual plugin constructor
  function DropZone(elem, opts) {
    var self = this;

    self.elem = $(elem);
    self.opts = $.extend({}, defaults, self.elem.data(), opts);
    self.form = self.elem.find(".dropPluginForm");
    self.validationKey = self.form.find("[name=validation_key]");
    self.mimeRegex = self.opts.mime.length?new RegExp("\.(" + self.opts.mime + ")$", "i"):null;
    self.init();
  }

  DropZone.prototype.init = function () {
    var self = this;

    // Hack to remove the TopicInteractionPlugin dropzone from $("body")
    // so our other dropzones fire when DropPlugin is active on the page.
    $("body").fileupload("destroy");

    // Add/remove CSS when the drop target is dragged over
    self.elem.on("dragenter", function() {
      self.elem.addClass("hover");
    }).on("dragleave dragexit dragged", function() {
      self.elem.removeClass("hover");
    });

    // Attach the file upload plugin
    self.form.fileupload({
        // url: foswiki.getScriptUrl("rest", "DropPlugin", "upload"),
        url: foswiki.getScriptUrl("rest", "TopicInteractionPlugin", "upload"),
        dataType: 'json',
        formData: function() {
            if (self.validationKey.length) {
              // If validation is enabled
              self.validationKey.val(StrikeOne.calculateNewKey(self.validationKey.val()));
            }
            var data = self.form.serializeArray();
            // Add random ID for TopicInteractionPlugin/upload REST handler
            data.push({name: "id", value: Math.ceil(Math.random() * 1000)});
            return data;
        },
        dropZone: self.form,
        add: function (e, data) {
            var origName = data.files[0].name;
            // Check if it's allowed to be dropped here
            if (self.mimeRegex && self.mimeRegEx.test(origName)) { // eslint-disable-line no-useless-escape
                $.pnotify({
                    text: "Cannot drop " + origName + ",  file type mismatch",
                    type: "error" });
                self.elem.removeClass("hover");
               return;
            }
            data.files[0].uploadName = self.form.find("[name=name]").val();
            data.submit();
        },
        fail: function(e, data) {
            var response = data.jqXHR.responseJSON
                || { error: { message: "unknown error"} };
            $.pnotify({
                text: response.error.message,
                type: "error"
            });
        },
        done: function(e, xhr) {
            var data = xhr.result;

            // Import the new nonce, if validation is enabled
            if (self.validationKey.length && data.nonce) {
                self.validationKey.val("?" + data.nonce);
            }

            // Use the RenderPlugin to update the inner zone
            self.form.find('.dropPluginInner').each(function() {
                var $inner = $(this);
                $.ajax({
                    url: foswiki.getScriptUrl("rest", "RenderPlugin", "template"),
                    data: {
                        topic: self.form.find("[name=topic]").val(),
                        name: "dropplugin",
                        expand: "DropPlugin:refresh",
                        attachment: self.form.find("[name=name]").val(),
                        render: true
                    },
                    dataType: 'html',
                    success: function(data) {
                        $inner.html(data)
                            // Force refresh of any images
                            .find("img").each(function() {
                                $(this).attr(
                                    'src',
                                    $(this).attr('src') + '?t='+new Date());
                            });
                    }
                    // Silent fail
                });
            });
        },
        always: function() {
            // Dunhoverin
            self.elem.removeClass("hover");
        }
    });
  };

  // A plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn.dropZone = function (opts) {
    return this.each(function () {
      if (!$.data(this, "DropZone")) {
        $.data(this, "DropZone", new DropZone(this, opts));
      }
    });
  };

  // Enable declarative widget instanziation
  $(function() {
    $(".dropPluginZone:not(.inited)").livequery(function() {
      $(this).addClass("inited").dropZone();
    });
  });

})(jQuery);
