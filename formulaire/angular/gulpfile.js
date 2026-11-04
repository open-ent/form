var gulp = require('gulp');
var webpack = require('webpack-stream');
const replace = require('gulp-replace');
var clean = require('gulp-clean');
var argv = require('yargs').argv;
var path = require('path');

if (argv.targetModule) {
    console.log("using arg:", argv.targetModule);
    apps = [argv.targetModule];
}

function dropDist() {
    return gulp.src(['./src/dist'], {read: false, allowEmpty: true}).pipe(clean());
}

function dropBuild() {
    return gulp.src(['./build'], {read: false, allowEmpty: true}).pipe(clean());
}

gulp.task('drop-cache', gulp.parallel(dropDist, dropBuild));

// Polices binaires : gulp 5 lit en UTF-8 par défaut, d'où encoding: false.
gulp.task('copy-mdi-font', gulp.series('drop-cache', function copyMdiFont() {
    return gulp.src('./node_modules/@mdi/font/fonts/*', {encoding: false})
        .pipe(gulp.dest('./src/mdi'));
}));

// Appel direct du webpack embarqué par webpack-stream (webpack 1, celui qui a toujours produit
// les bundles) : ses flux « through » ne se raccordent pas à ceux de gulp 5. Les erreurs de
// typage restent signalées sans interrompre le build, comme sous gulp 3.
gulp.task('webpack', gulp.series('copy-mdi-font', function bundle(done) {
    var config = require('./webpack.config.js');
    config.output.path = path.resolve(__dirname, './src/dist');
    webpack.webpack(config, (err, stats) => {
        if (stats) console.log(stats.toString({colors: false, chunks: false}));
        done(err);
    });
}));

function views() {
    return gulp.src("./src/view-src/**/*.html")
        .pipe(replace('@@VERSION', Date.now()))
        .pipe(gulp.dest("./src/view"));
}

function copyBehaviours() {
    return gulp.src("./src/dist/behaviours.js")
        .pipe(gulp.dest("./src/js"));
}

gulp.task('build', gulp.series('webpack', gulp.parallel(views, copyBehaviours)));
