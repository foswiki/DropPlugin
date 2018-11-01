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
jQuery(function($) {
        // Hack to remove the TopicInteractionPlugin dropzone from $("body")
        // so our other dropzones fire when DropPlugin is active on the page.
        $(".dropPluginForm").first().each(function() {
            $("body").fileupload("destroy");
        });

        $(".dropPluginForm").each(function() {
            var $form = $(this), 
                $validationKey = $form.find("[name=validation_key]"),
                $dropZone = $form.parent();

            // Get legal extensions
            var extensions = $form.data('mime');

            // Add/remove CSS when the drop target is dragged over
            $dropZone.on("dragenter", function() {
              $dropZone.addClass("hover");
            }).on("dragleave dragexit dragged", function() {
              $dropZone.removeClass("hover");
            });

            // Attach the file upload plugin
            $form.fileupload({
                // url: foswiki.getScriptUrl("rest", "DropPlugin", "upload"),
                url: foswiki.getScriptUrl("rest", "TopicInteractionPlugin", "upload"),
                dataType: 'json',
                formData: function() {
                    if ($validationKey.length) {
                      // If validation is enabled
                      $validationKey.val(StrikeOne.calculateNewKey($validationKey.val()));
                    }
                    var data = $form.serializeArray();
                    // Add random ID for TopicInteractionPlugin/upload REST handler
                    data.push({name: "id", value: Math.ceil(Math.random() * 1000)});
                    return data;
                },
                dropZone: $form,
                add: function (e, data) {
                    var origName = data.files[0].name;
                    // Check if it's allowed to be dropped here
                    if (extensions.length > 0
                        && !new RegExp("\.(" + extensions + ")$", "i").test(origName)) { // eslint-disable-line no-useless-escape
                        $.pnotify({
                            text: "Cannot drop " + origName + ",  file type mismatch",
                            type: "error" });
                        $dropZone.removeClass("hover");
                       return;
                    }
                    data.files[0].uploadName = form.name.value;
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
                    if ($validationKey.length && data.nonce) {
                        $validationKey.val("?" + data.nonce);
                    }

                    // Use the RenderPlugin to update the inner zone
                    $form.find('.dropPluginInner').each(function() {
                        var $inner = $(this);
                        $.ajax({
                            url: foswiki.getScriptUrl("rest", "RenderPlugin", "template"),
                            data: {
                                topic: form.topic.value,
                                name: "dropplugin",
                                expand: "DropPlugin:refresh",
                                attachment: form.name.value,
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
                    $dropZone.removeClass("hover");
                }
            });
        });
});
