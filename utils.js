/*
 * opts = {
 *   before_submit (function),
 *   submit_success (function),
 *   submit_failure (function)
 * }
*/

$.fn.ajaxify = function(opts) {

    function ajaxify_form($form) {
        var action = $form.attr('action');
        var method = $form.attr('method');

        $form.submit(function (evt) {
            evt.preventDefault();

            function submit() {
                var data = {};
                var vals;
                var i;

                $form.find(':input').each(function () {

                    if ($(this).is(':checkbox')) {
                        if ($(this).attr('checked')) {
                            data[$(this).attr('name')] = $(this).val();
                        }
                    } else {
                        data[$(this).attr('name')] = $(this).val();
                    }

                });
                
                $.ajax({
                    url: action,
                    type: method,
                    data: data,
                    success: opts.submit_success,
                    error: opts.submit_failure
                });
            }

            if (opts.before_submit) {
                opts.before_submit(submit);
            } else {
                submit();
            }

            return false;
        });
    }

    this.each(function () {
        var $form = $(this);
        if ($form.is('form')) {
            ajaxify_form($form);
        }
    });
    return this;
};


var draggify_uploads = {};
$.fn.draggify = function () {
    var targets = this;
    var uploads_to_do = 0;

    function count_finished_upload(opts) {
        uploads_to_do--;
        if (uploads_to_do === 0 &&
            typeof(opts.all_uploads_done) !== 'undefined') {
            opts.all_uploads_done();
        }
    }

    function upload_single_file($container, file, opts) {
        var fd = new FormData();
        fd.append('file', file.file);
        $.map(opts.extra_data || {}, function (value, key) {
            fd.append(key, value);
        });
        
        $.ajax({
            url: opts.upload_url,
            type: 'POST',
            processData: false,
            contentType: false,
            data: fd,
            success: function (resp) {
                if (typeof(opts.single_upload_done) !== 'undefined') {
                    opts.single_upload_done(file, resp);
                }
                count_finished_upload(opts);
            },
            error: function (resp) {
                if (typeof(opts.single_upload_error) !== 'undefined') {
                    opts.single_upload_error(file, resp);
                }
                count_finished_upload(opts);
            }
        });
    }

    function do_upload($container, files, opts) {
        uploads_to_do = files.length;
        if (uploads_to_do === 0) {
            if (typeof(opts.all_uploads_done) !== 'undefined') {
                opts.all_uploads_done();
            }
        } else {
            $.map(files, function (f) {
                upload_single_file($container, f, opts);
            });
        }
    }

    return {
        
        /*
         * multi: boolean (allows multiple files)
         * upload_on_drag: boolean (upload as soon as a file is dragged into the
         *   container)
         * single_upload_done: function (called when a single upload is completed)
         * single_upload_error: function
         * upload_url: string
         * extra_data: object (extra POST data to include in each upload)
         * drag_enter: function
         * drag_over: function
         * drop: function (called when file is dropped, before uploaded)
         */
        init: function(opts) {

            function default_drag_event(evt) {
                evt.stopPropagation();
                evt.preventDefault();
            }

            function drop($container, opts) {
                return function (evt) {
                    evt.stopPropagation();
                    evt.preventDefault();

                    var dt = evt.dataTransfer;
                    var files = dt.files;
                    var uploads_key = $container.get(0);
                    var id_files;

                    if (!draggify_uploads[uploads_key]) {
                        draggify_uploads[uploads_key] = [];
                    }

                    id_files = $.map(files, function (f, i) {
                        return {
                            'id': draggify_uploads[uploads_key].length + i,
                            'file': f
                        };
                    });

                    function on_drop() {
                        if (opts.upload_on_drag) {
                            do_upload($container, id_files, opts);
                        } else {
                            if (!opts.multi) {
                                id_files = [{
                                    'id': 0,
                                    'file': files[0]
                                }];
                                draggify_uploads[uploads_key] = id_files;
                            } else {
                                draggify_uploads[uploads_key] =
                                    draggify_uploads[uploads_key].
                                    concat(id_files);
                            }
                        }
                    }
                    
                    if (typeof(opts.drop) !== 'undefined') {
                        opts.drop(id_files, on_drop);
                    } else {
                        on_drop();
                    }
                };
            }


            if (typeof(opts.multi) === 'undefined') {
                opts.multi = false;
            }
            if (typeof(opts.submit_on_drag) === 'undefined') {
                opts.submit_on_drag = false;
            }
            if (typeof(opts.drag_enter) === 'undefined') {
                opts.drag_enter = default_drag_event;
            }
            if (typeof(opts.drag_over) === 'undefined') {
                opts.drag_over = default_drag_event;
            }

            targets.each(function () {
                var $this = $(this);
                $this.get(0).addEventListener('dragenter',
                                              opts.drag_enter,
                                              false);
                $this.get(0).addEventListener('dragover',
                                              opts.drag_over,
                                              false);

                $this.get(0).addEventListener('drop',
                                              drop($this, opts),
                                              false);
            });

        },

        /*
         * single_upload_done: function (called when a single upload is completed)
         * all_uploads_done: function (called when all uploads in a particular
             drop zone are completed)
         * upload_url: string
         * extra_data: object (extra POST data to include in each upload)
         */
        upload_files: function (opts) {
            targets.each(function () {
                do_upload($(this), draggify_uploads[this] || [], opts);
            });
        },

        /*
         * file_id (integer): the identifier of a file passed to
         *   opts.drop
         */
        remove_file: function (file_id) {
            targets.each(function () {
                draggify_uploads[this][file_id] = undefined;
            });
        }

    };
};
