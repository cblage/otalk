var fs = require('fs');
var https = require('https');
var express = require('express');
var helmet = require('helmet');
var Moonboots = require('moonboots');
var config = require('getconfig');
var templatizer = require('templatizer');


var app = express();

app.use(express.compress());
app.use(express.static(__dirname + '/public'));
if (!config.isDev) {
    app.use(helmet.xframe());
}
app.use(helmet.iexss());
app.use(helmet.contentTypeOptions());


var clientApp = new Moonboots({
    main: __dirname + '/clientapp/app.js',
    templateFile: __dirname + '/clientapp/templates/main.html',
    developmentMode: config.isDev,
    libraries: [
        __dirname + '/clientapp/libraries/zepto.js',
        __dirname + '/clientapp/libraries/ui.js',
        __dirname + '/clientapp/libraries/resampler.js',
        __dirname + '/clientapp/libraries/IndexedDBShim.min.js'
    ],
    browserify: {
        debug: false
    },
    stylesheets: [
        __dirname + '/public/css/otalk.css'
    ],
    server: app
});

if (config.isDev) {
    clientApp.config.beforeBuildJS = function () {
        var clientFolder = __dirname + '/clientapp';
        templatizer(clientFolder + '/templates', clientFolder + '/templates.js');

        var pkginfo = JSON.parse(fs.readFileSync('./package.json'));
        var cacheManifest = fs.readFileSync('clientapp/templates/misc/manifest.cache', 'utf-8');
        cacheManifest = cacheManifest
            .replace('#{version}', pkginfo.version + ' ' + Date.now())
            .replace('#{jsFileName}', '/' + clientApp.jsFileName())
            .replace('#{cssFileName}', '/' + clientApp.cssFileName());

        fs.writeFileSync('./public/x-manifest.cache', cacheManifest);
    };
}

app.set('view engine', 'jade');

app.get('/login', function (req, res) {
    res.render('login');
});
app.get('/logout', function (req, res) {
    res.render('logout');
});
app.get('/oauth/login', function (req, res) {
    res.redirect('https://apps.andyet.com/oauth/authorize?client_id=' + config.andyetAuth.id + '&response_type=token');
});
app.get('/oauth/callback', function (req, res) {
    res.render('oauthLogin');
});

app.get('/manifest.webapp', function (req, res, next) {
    fs.readFile('./public/x-manifest.webapp', function doneReadingManifest(err, manifestContents) {
        if (err) return next(err);

        res.set('Content-Type', 'application/x-web-app-manifest+json');
        res.send(manifestContents);
    });
});

app.get('/manifest.cache', function (req, res, next) {
    fs.readFile('./public/x-manifest.cache', function doneReadingManifestCache(err, manifestCacheContents) {
        if (err) return next(err);

        res.set('Content-Type', 'text/cache-manifest');
        res.send(manifestCacheContents);
    });
});

// serves app on every other url
app.get('*', clientApp.html());


app.use(function handleError(err, req, res, next) {
    var errorResult = {message: 'Something bad happened :('};
    
    if (config.isDev) {
        if (err instanceof Error) {
            if (err.message) {
                errorResult.message = err.message;
            }

            if (err.stack) {
                errorResult.stack = err.stack;
            }
        }
    }

    res.status(500);
    res.render('error', errorResult);
});

//https.createServer({
//    key: fs.readFileSync(config.http.key),
//    cert: fs.readFileSync(config.http.cert)
//}, app).listen(config.http.port);
app.listen(config.http.port);
console.log('demo.stanza.io running at: ' + config.http.baseUrl);
