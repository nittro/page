var gulp = require('gulp'),
    jasmineBrowser = require('gulp-jasmine-browser');

function getNittroFiles(pkg) {
    var prefix = pkg ? './node_modules/' + pkg + '/' : './';
    return require(prefix + 'nittro.json').files.js.map(function (file) {
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
    return gulp.src(files)
        .pipe(jasmineBrowser.specRunner({console: true}))
        .pipe(jasmineBrowser.headless());
});

gulp.task('default', ['test']);
