var gulp = require('gulp'),
    addsrc = require('gulp-add-src'),
    less = require('gulp-less'),
    jasmineBrowser = require('gulp-jasmine-browser');

function getNittroFiles(pkg, type) {
    var prefix = pkg ? './node_modules/' + pkg + '/' : './';
    return require(prefix + 'nittro.json').files[type || 'js'].map(function (file) {
        return prefix + file;
    });
}

var files = [
        'node_modules/promiz/promiz.js'
    ]
    .concat(getNittroFiles('nittro-core'))
    .concat(getNittroFiles('nittro-ajax'))
    .concat(getNittroFiles())
    .concat('tests/mocks/**.js', 'tests/specs/**.spec.js');

gulp.task('test', function () {
    return gulp.src(getNittroFiles(null, 'css'))
        .pipe(less())
        .pipe(addsrc.append(files, {base: process.cwd()}))
        .pipe(jasmineBrowser.specRunner({console: true}))
        .pipe(jasmineBrowser.headless());
});

gulp.task('default', ['test']);
