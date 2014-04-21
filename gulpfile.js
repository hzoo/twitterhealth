//require
var gulp = require('gulp');
// var gutil = require('gulp-util');
    // Load plugins
var $ = require('gulp-load-plugins')({
        camelize: true
    });
var tinylr = require('tiny-lr');
var express = require('express');
var path = require('path');

//folders
var config = {
    appDir: 'app',
    distDir: 'dist',
    scriptsDir: 'scripts',
    stylesDir: 'styles',
    imagesDir: 'images',
    assetsDir: 'assets',
    concatName: 'th',
    indexName: 'index'
};

//clean
gulp.task('clean', function () {
    return gulp.src([config.distDir], {
        read: false
    })
    .pipe($.clean());
});

//vendor styles
gulp.task('styles-vendor', function() {
    var stylesDir = path.join(config.distDir, config.stylesDir);

    return gulp.src([config.appDir + '/styles/*.min.css'])
        .pipe($.concat('vendors.min.css'))
        .pipe(gulp.dest(stylesDir))
        .pipe($.csso());
});

//concat and minify css
gulp.task('styles', function () {
    var stylesDir = path.join(config.distDir, config.stylesDir);
    return gulp.src([config.appDir + '/styles/*.css', '!' + config.appDir + '/styles/*.min.css'])
        .pipe($.changed(stylesDir))
        .pipe($.concat(config.concatName + '.css'))
        // .pipe(gulp.dest(path.join(config.distDir, config.stylesDir)))
        .pipe($.rename({
            suffix: '.min'
        }))
        // .pipe($.minifyCss())
        .pipe($.csso())
        // .pipe($.rev())
        .pipe(gulp.dest(stylesDir))
        .pipe($.size({showFiles: true}));
        // .pipe($.notify({
        //     message: 'Styles task complete'
        // }));
});

// Lint JS
gulp.task('lint', function () {
    return gulp.src([config.appDir + '/scripts/*.js', '!' + config.appDir + '/scripts/*.min.js'])
        .pipe($.jshint())
        // .pipe($.jshint('.jshintrc'))
        .pipe($.jshint.reporter('default'));
});

// Concat & Minify JS
gulp.task('minify', function () {
    var scriptsDir = path.join(config.distDir, config.scriptsDir);
    return gulp.src(config.appDir + '/scripts/*.js')
        .pipe($.changed(scriptsDir))
        .pipe($.concat(config.concatName + '.js'))
        // .pipe(gulp.dest(path.join(config.distDir, config.scriptsDir)))
        .pipe($.rename({
            suffix: '.min'
        }))
        .pipe($.stripDebug())
        .pipe($.uglify())
        // .pipe($.rev())
        .pipe(gulp.dest(scriptsDir))
        .pipe($.size({showFiles: true}));
        // .pipe($.notify({
        //     message: 'Scripts task complete'
        // }));
});

//scripts
gulp.task('scripts', ['minify']);

//images
gulp.task('images', function () {
    var imageDir = path.join(config.distDir, config.imagesDir);
    return gulp.src(config.appDir + '/images/*')
        .pipe($.changed(imageDir))
        .pipe($.cache($.imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest(imageDir))
        .pipe($.size({showFiles: true}));
        // .pipe($.notify({
        //     message: 'Images task complete'
        // }));
});

gulp.task('assets', function() {
    var assetsDir = path.join(config.distDir, config.assetsDir);
    // var assetsDir = 'dist/assets';
    return gulp.src(config.appDir + '/assets/**/*')
        .pipe($.changed(assetsDir))
        .pipe(gulp.dest(assetsDir));
        // .pipe($.size({showFiles: true}));
});

// html
gulp.task('html',function() {
    return gulp.src('./' + config.appDir + '/index.html')
        .pipe($.inject(gulp.src(['./' + config.distDir + '/styles/' + config.concatName + '.min.css'], {read: false}), {ignorePath: config.distDir, starttag: '<!-- inject:head:{{ext}} -->'}))
        .pipe($.inject(gulp.src(['./' + config.distDir + '/scripts/*.js', './' + config.distDir + '/styles/vendors.min.css'], {read: false}), {ignorePath: config.distDir}))
        .pipe($.minifyHtml({comments:true,spare:true}))
        .pipe(gulp.dest('./' + config.distDir))
        .pipe($.size({showFiles: true}));
});

//servers
var createServers = function (port, lrport) {
    var lr = tinylr();
    lr.listen(lrport, function () {
        // gutil.log('LR Listening on', lrport);
        console.log('LR Listening on', lrport);
    });

    var app = express();
    app.use(express.static(path.resolve('./')));
    app.listen(port, function () {
        // gutil.log('Listening on', port);
        console.log('Listening on', port);
    });

    return {
        lr: lr,
        app: app
    };
};

var servers;
gulp.task('server', function() {
    servers = createServers(8081, 35729);
});

// Watch Our Files
gulp.task('watch', ['server'], function () {
    gulp.watch(path.join(config.appDir,'scripts/*.js'), ['scripts']);
    gulp.watch(path.join(config.appDir,'styles/*.css'), ['styles', 'styles-vendor']);
    gulp.watch(path.join(config.appDir,'images/*'), ['images']);
    gulp.watch(path.join(config.appDir,'*.html'), ['html']);

    gulp.watch(['./**/*', '!./node_modules/**/*'], function (evt) {
        // gutil.log(gutil.colors.cyan(evt.path), 'changed');
        console.log(evt.path, 'changed');
        servers.lr.changed({
            body: {
                files: [evt.path]
            }
        });
    });

});

//all scripts except html
gulp.task('main', ['styles', 'styles-vendor', 'scripts', 'images', 'assets']);

gulp.task('all', ['main'], function () {
    return gulp.start('html');
});

gulp.task('default', ['clean'], function () {
    return gulp.start('all');
});

gulp.task('build', ['main'], function () {
    return gulp.start('html');
});

gulp.task('heroku:production', ['default']);
