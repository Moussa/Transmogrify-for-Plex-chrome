trakt = {
    metadata_xml: null,
    server: null,

    init: function(metadata_xml, type, server) {
        trakt.metadata_xml = metadata_xml;
        trakt.server = server;

        var show_name;
        var season;
        var episode;
        var movie_title;

        if (type === "show") {
            if (trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle") != null) {
                show_name = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle");
            }
            else {
                show_name = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("title");
            }
            debug("trakt plugin: Got show name - " + show_name);
        }
        else if (type === "episode") {
            season = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("parentIndex");
            episode = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("index");
            debug("trakt plugin: Fetching grandparent metadata xml");
            var grandparent_id = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("grandparentRatingKey");
            debug("trakt plugin: Grandparent id - " + grandparent_id);

            var grandparent_xml_url = "http://" + trakt.server["address"] + ":" + trakt.server["port"] + "/library/metadata/" + grandparent_id + "?X-Plex-Token=" + trakt.server["access_token"]
            var grandparent_xml = utils.getXML(grandparent_xml_url, false);

            if (grandparent_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle") != null) {
                show_name = grandparent_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle");
            }
            else {
                show_name = grandparent_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("title");
            }
            debug("trakt plugin: Got show name - " + show_name);
            debug("trakt plugin: Got season number - " + season);
            debug("trakt plugin: Got episode number - " + episode);
        }
        else if (type === "movie") {
            movie_title = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("title");
            debug("trakt plugin: Got movie title - " + movie_title);
        }

        var url;
        var rating;
        if (type === "show") {
            var show_data = trakt.getTraktData(show_name, type);
            url = show_data["url"];
            rating = show_data["ratings"]["percentage"];
        }
        else if (type === "episode") {
            var show_data = trakt.getTraktData(show_name, "show");
            url = show_data["url"] + "/season/" + season + "/episode/" + episode;
            rating = show_data["ratings"]["percentage"];
        }
        else if (type === "movie") {
            var movie_data;
            // it's more accurate to search by imdb id, otherwise fall back to movie name
            debug("trakt plugin: Grabbing imdb id");
            var agent = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("guid");
            // check if using the freebase metadata agent
            if (/com\.plexapp\.agents\.imdb/.test(agent)) {
                var imdb_id = agent.match(/^com\.plexapp\.agents\.imdb:\/\/(.+)\?/)[1];
                debug("trakt plugin: imdb id found - " + imdb_id);
                movie_data = trakt.getTraktData(imdb_id, type);
            }
            else {
                debug("trakt plugin: imdb id not found, falling back to movie name");
                movie_data = trakt.getTraktData(movie_title, type);
            }
            url = movie_data["url"];
            rating = movie_data["ratings"]["percentage"];
        }

        // create trakt link element
        var trakt_container = trakt.constructTraktLink(url, rating);

        // insert trakt link element to bottom of metadata container
        debug("trakt plugin: Inserting trakt container into page");
        document.getElementsByClassName("metadata-right")[0].appendChild(trakt_container);
    },

    getTraktData: function(title, type) {
        debug("trakt plugin: Reading API key");
        var api_key = utils.readFile(chrome.extension.getURL("resources/api_keys/trakt_api_key.txt"));
        debug("trakt plugin: Successfully read API key");

        var api_url;
        if (type === "show") {
            api_url = "http://api.trakt.tv/search/shows.json/" + api_key + "?query=" + encodeURIComponent(title) + "&limit=1";
        }
        else if (type === "movie") {
            api_url = "http://api.trakt.tv/search/movies.json/" + api_key + "?query=" + encodeURIComponent(title) + "&limit=1";
        }

        var trakt_json = utils.getJSON(api_url, false);
        return trakt_json[0];
    },

    constructTraktLink: function(trakt_url, trakt_rating) {
        var logo_url = chrome.extension.getURL("resources/trakt/trakt_logo.png")

        var trakt_container_element = document.createElement("div");
        trakt_container_element.setAttribute("id", "trakt-container");

        // construct link
        var trakt_element_link = document.createElement("a");
        trakt_element_link.setAttribute("href", trakt_url);
        trakt_element_link.setAttribute("target", "_blank");

        // construct logo
        var trakt_element_img = document.createElement("img");
        trakt_element_img.setAttribute("src", logo_url);

        trakt_element_link.appendChild(trakt_element_img);

        // construct rating
        var trakt_rating_element = document.createElement("div");
        trakt_rating_element.setAttribute("id", "trakt-rating");
        var rating_text = document.createTextNode(trakt_rating + "%");

        // construct rating image
        var trakt_rating_image = document.createElement("img");
        if (parseInt(trakt_rating) > 59) {
            trakt_rating_image.setAttribute("src", chrome.extension.getURL("resources/trakt/trakt_love.png"));
        }
        else {
            trakt_rating_image.setAttribute("src", chrome.extension.getURL("resources/trakt/trakt_hate.png"));
        }
        trakt_rating_image.setAttribute("id", "trakt-rating-image");

        trakt_rating_element.appendChild(rating_text);
        trakt_rating_element.appendChild(trakt_rating_image);

        trakt_container_element.appendChild(trakt_element_link);
        trakt_container_element.appendChild(trakt_rating_element);

        return trakt_container_element;
    }
}