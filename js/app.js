/* ========================================================================
 * Music v1.2.8
 * https://github.com/alashow/music
 * ======================================================================== */

$(document).ready(function($) {

    $(document).keydown(function(e) {
        if (!$('#query').is(':focus')) {
            var unicode = e.charCode ? e.charCode : e.keyCode;
            if (unicode == 39) {
                playNext();

                track('button', 'next');
            } else if (unicode == 37) {
                playPrev();

                track('button', 'prev');
            }
        };
    });

    $('#player').affix({
            offset: {
                top: 400,
                bottom: function() {
                    return (this.bottom = $('.footer').outerHeight(true))
                }
            }
    });

    /* ========================================================================
     * To get your own token you need first create vk application at https://vk.com/editapp?act=create
     * Then  get your APP_ID and CLIENT_SECRET at application settings
     * Now open this url from your logined to vk browser, this will redirect to blank.html with your token:
     * https://oauth.vk.com/authorize?client_id=APP_ID&client_secret=CLIENT_SECRET&scope=audio,offline&response_type=token
     * ======================================================================== */
    // Default config for vk audio.search api
    var vkConfig = {
        url: "https://api.vk.com/method/audio.search",
        autoComplete: 1,
        accessToken: "fff9ef502df4bb10d9bf50dcd62170a24c69e98e4d847d9798d63dacf474b674f9a512b2b3f7e8ebf1d69",
        count: 300 // 300 is limit of vk api
    };

    var config = {
        title: "datmusic",
        appUrl: window.location.protocol + "//datmusic.xyz/",
        downloadServerUrl: window.location.protocol + "//datmusic.xyz/", //change if download.php file located elsewhere
        proxyMode: true, //when proxyMode enabled, search will performed through server (search.php), advantages of proxyMode are: private accessToken, less captchas. Disadvantages: preview of audio will be slower
        prettyDownloadUrlMode: true, //converts http://datmusic.xyz/download.php?audio_id=16051160_137323200 to http://datmusic.xyz/JjGBD:AEnvc, see readme for rewriting regex
        performerOnly: false,
        sort: 2,
        oldQuery: null,
        defaultLang: "en",
        langCookie: "musicLang",
        sortCookie: "musicSort",
        performerOnlyCookie: "musicPerformerOnly",
        currentTrack: -1
    };

    i18n.init({
        lng: (!$.cookie(config.langCookie)) ? config.defaultLang : $.cookie(config.langCookie),
        resStore: locales,
        cookieName: config.langCookie,
    }, function(err, t) {
        $("body").i18n();
    });
    $('[data-toggle="tooltip"]').tooltip();

    //Download apk if android
    var ua = navigator.userAgent.toLowerCase();
    var isAndroid = ua.indexOf("android") > -1;
    if (isAndroid) {
        var r = confirm(i18n.t("apkDownload"));
        if (r == true) {
            track('android', "confirm");
            var win = window.open("https://bitly.com/M-APK", '_blank');
            win.focus();
        } else {
            track('android', "deny");
        }
    }

    //Settings
    $('#settings').on('click', function(event) {
        $('#settingsModal').modal("show");
    });

    //set selected settings, please.
    $('#languageSelect').val(i18n.lng());

    if ($.cookie(config.sortCookie)) {
        $('#sortSelect').val($.cookie(config.sortCookie));
        config.sort = $.cookie(config.sortCookie);
    } else {
        $('#sortSelect').val(config.sort);
    }

    if ($.cookie(config.performerOnlyCookie) == "true") {
        $('#performerOnlyCheck').prop("checked", $.cookie(config.performerOnlyCookie));
        config.performerOnly = $.cookie(config.performerOnlyCookie);
    }

    //change language live
    $('#languageSelect').on('change', function(event) {
        i18n.setLng($(this).val(), function(err, t) {
            $("body").i18n();
            title = $('#jp_container_1').attr('title');
            $('#jp_container_1').attr('data-original-title', title);
            $('#jp_container_1').attr('title', '');
        });
    });

    //change sort type
    $('#sortSelect').on('change', function(event) {
        sortType = parseInt($(this).val());
        config.sort = sortType;
        $.cookie(config.sortCookie, sortType);
        if (config.oldQuery != null) {
            search(config.oldQuery, null, null, true);
        };
    });

    $('#performerOnlyCheck').change(function() {
        isChecked = $(this).is(':checked');
        config.performerOnly = isChecked;
        $.cookie(config.performerOnlyCookie, isChecked);

        if (config.oldQuery != null) {
            search(config.oldQuery, null, null, true);
        };
    });

    //Trigger search button when pressing enter button
    $('#query').bind('keypress', function(event) {
        if (event.keyCode == 13) {
            $('.search').trigger('click');
        };
    });

    $('.search').on('click', function(event) {
        typedQuery = $('#query').val();
        if (typedQuery == "") return; // return if query empty
        search(typedQuery, null, null, true);
    });

    // Initialize player
    $("#jquery_jplayer_1").jPlayer({
        swfPath: config.appUrl + "js",
        supplied: "mp3",
        wmode: "window",
        smoothPlayBar: true,
        keyEnabled: true,
        remainingDuration: true,
        toggleDuration: true,
        volume: 1,
        keyBindings: {
            play: {
                key: 32, // p
                fn: function(f) {
                    track('button', 'play/pause');
                    if (f.status.paused) {
                        f.play();
                    } else {
                        f.pause();
                    }
                }
            }
        },
        ended: function() {
            itemCount = $('.list-group-item').length;
            console.log("#" + config.currentTrack + " ended, audio count in dom = " + itemCount);
            playNext();
        }
    });

    //sync playing/paused status with audio element
    $('.jp-play').click(function () {
        currentTrackEl = $($('.list-group-item')[config.currentTrack]).find('.play');
        $(el).find('.glyphicon').addClass('glyphicon-pause');
        $(el).find('.glyphicon').removeClass('glyphicon-play');
    });

    $('.jp-pause').click(function () {
        currentTrackEl = $($('.list-group-item')[config.currentTrack]).find('.play');
        $(el).find('.glyphicon').addClass('glyphicon-play');
        $(el).find('.glyphicon').removeClass('glyphicon-pause');
    });

    window.onpopstate = function(event) {
        searchFromQueryParam();
        console.log(event);
    };

    if (!searchFromQueryParam()) {
        //Simulating search for demo of searching
        var artists = [
            "Agnes Obel", "Aloe Black", "Andrew Belle", "Angus Stone", "Arctic Monkeys",
            "Avicii", "Balmorhea", "Barcelona", "Bastille", "Bastille", "Ben Howard",
            "Benj Heard", "Birdy", "Broods", "Calvin Harris", "Charlotte OC", "City of The Sun",
            "Clint Mansell", "Coldplay", "Daft Punk", "Damien Rice", "Daniela Andrade",
            "Daughter", "David O'Dowda", "Dawn Golden", "Dirk Maassen", "Ed Sheeran",
            "Fabrizio Paterlini", "Fink", "Fleurie", "Gem club", "Greg Haines", "Greg Maroney",
            "Groen Land", "Hans Zimmer", "Hozier", "Jamie XX", "Jaymes Young", "Jessie J",
            "Josef Salvat", "Julia Kent", "Kai Engel", "Keaton Henson", "Kina Grannis", "Kodaline",
            "Kygo", "Kyle Landry", "Lana Del Rey", "Lera Lynn", "Lights & Motion", "Linus Young",
            "Lo-Fang", "Lo-Fang", "Lorde", "Ludovico Einaudi", "M83", "MONO", "MS MR", "Macklemore",
            "Mammals", "Maroon 5", "Martin Garrix", "Mattia Cupelli", "Max Richter", "Message To Bears",
            "Mogwai", "Mumford & Sons", "Nils Frahm", "ODESZA", "Of Monsters and Men", "Oh Wonder",
            "Philip Glass", "Phoebe Ryan", "Ryan Keen", "Sam Smith", "Seinabo Sey", "Sia",
            "Takahiro Kido", "The xx", "Tom Odell", "VLNY", "Wye Oak", "X ambassadors",
            "Yann Tiersen", "Yiruma", "Young Summer", "Zack Hemsey", "Zinovia", "deadmau5",
            "pg.lost", "Ólafur Arnalds", "Нервы"
        ]

        var demoArtist = artists[Math.floor(Math.random() * artists.length)];
        search(demoArtist, null, null, false, true);
        $('#query').val(demoArtist);
    }

    //Main function for search
    function search(newQuery, captcha_sid, captcha_key, analytics, performer_only) {
        config.currentTrack = -1;
        if (newQuery.length > 1 && newQuery != config.oldQuery) {
            //change url with new query and page back support
            window.history.pushState(newQuery, $('title').html(), "?q=" + newQuery);
            //artist name for title
            document.title = newQuery.split(" -")[0] + " - " + config.title;
        };

        config.oldQuery = newQuery;

        var data = {
            q: newQuery,
            sort: config.sort,
            auto_complete: vkConfig.autoComplete,
            access_token: vkConfig.accessToken,
            count: vkConfig.count
        };

        if (captcha_sid != null && captcha_key != null) {
            data.captcha_sid = captcha_sid;
            data.captcha_key = captcha_key;
        };

        //search only by artist name
        if (performer_only) {
            data.performer_only = 1;
        } else {
            data.performer_only = config.performerOnly == true ? 1 : 0;
        }

        $.ajax({
            url: config.proxyMode ? config.appUrl + "search.php" : vkConfig.url,
            data: data,
            method: "GET",
            dataType: "jsonp",
            cache: true,
            beforeSend: function() {
                $('#loading').show(); // Show loading
            },
            error: function() {
                appendError(i18n.t("networError")); //Network error, ajax failed
            },
            success: function(msg) {
                if (msg.error) {
                    if (msg.error.error_code == 5) {
                        appendError(i18n.t("tokenError")); //Access token error
                    } else {
                        appendError(i18n.t("error", {
                            error: msg.error.error_msg
                        })); //Showing returned error
                    }

                    if (msg.error.error_code == 14) {
                        showCaptcha(msg.error.captcha_sid, msg.error.captcha_img); // api required captcha, showing it
                    };
                    return;
                };

                if (msg.response == 0) {
                    appendError(i18n.t("notFound")); //Response empty, audios not found 
                    return;
                };

                $('#result > .list-group').html(""); //clear list

                //appending new items to list
                for (var i = 1; i < msg.response.length; i++) {

                    downloadUrl = config.downloadServerUrl;
                    streamUrl = config.downloadServerUrl;
                    ownerId = msg.response[i].owner_id;
                    aid = msg.response[i].aid;

                    //little hard code :)
                    if (config.prettyDownloadUrlMode) {
                        streamUrl += "stream/";
                        //vk ownerId for groups is negative number, shit. invers it.
                        if (ownerId < 0) {
                            ownerId *= -1;
                            downloadUrl += "-";
                            streamUrl += "-";
                        }
                        prettyId = encode(ownerId) + ":" + encode(aid)
                        downloadUrl += prettyId;
                        streamUrl += prettyId;
                    } else {
                        downloadUrl += "download.php?audio_id=" + ownerId + "_" + aid;
                        streamUrl += "download.php?stream=true&audio_id=" + ownerId + "_" + aid;
                    }

                    audioTitle = msg.response[i].artist + ' - ' + msg.response[i].title;
                    audioDuration = msg.response[i].duration.toTime();

                    $('#result > .list-group')
                        .append('<li class="list-group-item"><span class="badge">' + audioDuration + '</span><span class="badge play" data-i18n="[title]clickToPlay"><span class="glyphicon glyphicon-play"></span></span><a class="iframe-download" data-i18n="[title]clickToDownload" target="_blank" data-src="' + (config.proxyMode ? streamUrl : msg.response[i].url) + '" href="' + downloadUrl + '">' + audioTitle + '</a></li>');
                };

                $(".list-group").i18n();

                $('.iframe-download').on('click', function(event) {
                    event.preventDefault();
                    url = $(this).attr('href');
                    $("<iframe/>").attr({
                        src: url,
                        style: "visibility:hidden; display:none"
                    }).appendTo($('body'));
                });

                //tracking search query
                track('search', newQuery);

                $('.play').on('click', function(event) {
                    play($(".list-group-item").index($(this).parent()));
                });
                $('#loading').hide();
            }
        });
    }

    /**
     *  Play next track.
     **/
    function playNext() {
        if (0 > config.currentTrack) {
            return; //there no music currently playing.
        };

        itemCount = $('.list-group-item').length - 1;
        if (config.currentTrack + 1 <= itemCount) {
            play(config.currentTrack + 1);
        } else { //else play first track
            console.log('seems like there no audios to play, i think. playing first one.');
            play(0);
        }

        track('play', "next");
    }

    /**
     *  Play previous track
     **/
    function playPrev() {
        if (0 > config.currentTrack) {
            return; //there no music currently playing.
        };

        if (config.currentTrack - 1 >= 0) {
            play(config.currentTrack - 1);
        } else { //else play last track
            console.log('this is first audio, nothing in back. playing last one.');
            itemCount = $('.list-group-item').length - 1;
            play(itemCount);
        }

        track('play', "prev");
    }

    /**
     * Set audio, play, show, set index, restate audios.
     * @param index of audio, in .list-group-item
     **/
    function play(index) {
        el = $($('.list-group-item')[index]).find('.play');

        //pause/play if clicked to current
        if (index == config.currentTrack) {
            if (!$('#jquery_jplayer_1').data().jPlayer.status.paused) {
                $("#jquery_jplayer_1").jPlayer("pause");
                $(el).find('.glyphicon').removeClass('glyphicon-pause');
                $(el).find('.glyphicon').addClass('glyphicon-play');
            } else {
                $("#jquery_jplayer_1").jPlayer("play");
                $(el).find('.glyphicon').removeClass('glyphicon-play');
                $(el).find('.glyphicon').addClass('glyphicon-pause');
            }
            return;
        };


        if (!el.length) {
            console.log("#" + index + " audio not found in dom")
            return;
        };

        $("#jquery_jplayer_1").jPlayer("setMedia", {
            mp3: $(el).parent().find('a').attr('data-src')
        });

        //do magic
        $("#jquery_jplayer_1").jPlayer("play");
        $('#jp_container_1').show();
        $('#player-space').show();

        //set current track index
        config.currentTrack = index;

        // changing all paused items to play
        $('.list-group').find('.glyphicon-pause').each(function(index, e) {
            $(e).removeClass('glyphicon-pause');
            $(e).addClass('glyphicon-play');
        });

        //change current audio to playing state
        $(el).find('.glyphicon').removeClass('glyphicon-play');
        $(el).find('.glyphicon').addClass('glyphicon-pause');

        track('playAudio', $($('.list-group-item')[index]).find('a').html());
    }

    //Clear list and append given error
    function appendError(error) {
        $('#result > .list-group').html("");
        $('#result > .list-group').append('<li class="list-group-item list-group-item-danger">' + error + '</li>');
        $('#loading').hide();
    }

    /**
     * @return isSearched from query param
     **/
    function searchFromQueryParam() {
        paramQuery = getParameterByName("q");
        if (paramQuery.length > 1) {
            search(paramQuery, null, null, true);
            $('#query').val(paramQuery);
            return true;
        } else {
            return false;
        }
    }

    //Showing captcha with given captcha id and image
    function showCaptcha(captchaSid, captchaImage) {
        //Tracking captchas
        $('#captchaModal').modal("show");
        $('#captchaImage').attr('src', captchaImage);

        //refresh captcha onclick
        $('#captchaImage').on('click', function(event) {
            $(this).attr('src', captchaImage);
        });

        //Searching with old query and captcha
        $('#captchaSend').on('click', function() {
            $('#captchaModal').modal("hide");
            search($('#query').val(), captchaSid, $('#captchaKey').val(), true);
        });

        //trigger send click after pressing enter button
        $('#captchaKey').bind('keypress', function(event) {
            if (event.keyCode == 13) {
                $('#captchaSend').trigger('click');
            };
        });

        track('captcha');
    }

    /**
     * @param query param name
     * @return query param value
     **/
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    // https://gist.github.com/alashow/07d9ef9c02ee697ab47d
    var map = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K',
        'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
        'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
        'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't',
        'u', 'v', 'x', 'y', 'z', '1', '2', '3'
    ];

    function encode(input) {
        length = map.length;
        var encoded = "";

        if (input == 0)
            return map[0];

        while (input > 0) {
            val = parseInt(input % length);
            input = parseInt(input / length);
            encoded += map[val];
        }

        return encoded;
    }

    function decode(encoded) {
        length = map.length;
        decoded = 0;

        for (i = encoded.length - 1; i >= 0; i--) {
            ch = encoded[i];
            val = map.indexOf(ch);
            decoded = (decoded * length) + val;
        }

        return decoded;
    }
    // end functions from gist

    //Sec To Time
    Number.prototype.toTime = function() {
        var sec_num = parseInt(this, 10);
        var hours = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        var time = minutes + ':' + seconds;
        return time;
    }

    function track(type, value) {
        try {
            if (ga) {
                ga('send', 'event', type, value);
            };
        } catch (e) {
            console.error("outer", e.message);
        }
    }
});