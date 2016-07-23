module.exports = function (grunt) {

    var files = grunt.file.readJSON('nittro.json').files;

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                mangle: false,
                sourceMap: false
            },
            nittro: {
                files: {
                    'dist/js/nittro-page.min.js': files.js
                }
            }
        },

        concat: {
            options: {
                separator: ";\n"
            },
            nittro: {
                files: {
                    'dist/js/nittro-page.js': files.js
                }
            }
        },

        less: {
            min: {
                options: {
                    compress: true
                },
                files: {
                    'dist/css/nittro-page.min.css': files.css
                }
            },
            full: {
                options: {
                    compress: false
                },
                files: {
                    'dist/css/nittro-page.css': files.css
                }
            }
        },

        jasmine: {
            src: files.js.concat(
                'tests/mocks/Ajax.js'
            ),
            options: {
                styles: [
                    'bower_components/nittro-extras-flashes/dist/css/nittro-extras-flashes.css',
                    'dist/css/nittro-page.css'
                ],
                vendor: [
                    'bower_components/promiz/promiz.min.js',
                    'bower_components/nittro-core/dist/js/nittro-core.js',
                    'bower_components/nittro-ajax/dist/js/nittro-ajax.js',
                    'bower_components/nittro-datetime/dist/js/nittro-datetime.js',
                    'bower_components/nittro-neon/dist/js/nittro-neon.js',
                    'bower_components/nittro-di/dist/js/nittro-di.js',
                    'bower_components/nittro-extras-flashes/dist/js/nittro-extras-flashes.js'
                ],
                specs: 'tests/specs/**.spec.js',
                display: 'short',
                summary: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.registerTask('default', ['uglify', 'concat', 'less']);
    grunt.registerTask('test', ['jasmine']);

};
