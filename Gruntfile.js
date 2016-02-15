module.exports = function (grunt) {

    var NittroPage = [
        'src/js/Nittro/Ajax/FormData.js',
        'src/js/Nittro/Ajax/Request.js',
        'src/js/Nittro/Ajax/Response.js',
        'src/js/Nittro/Ajax/Service.js',
        'src/js/Nittro/Ajax/Transport/Native.js',
        'src/js/Nittro/Page/Snippet.js',
        'src/js/Nittro/Page/Transitions.js',
        'src/js/Nittro/Page/Service.js',
        'src/js/Nittro/Widgets/FlashMessages.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                mangle: false,
                sourceMap: false
            },
            nittro: {
                files: {
                    'dist/js/nittro-page.min.js': NittroPage,
                    'dist/js/nittro-page.full.min.js': [
                        'bower_components/promiz/promiz.min.js',
                        'bower_components/nittro-core/dist/js/nittro-core.js'
                    ].concat(
                        NittroPage,
                        'src/js/bootstrap.js'
                    )
                }
            }
        },

        concat: {
            options: {
                separator: ";\n"
            },
            nettejs: {
                files: {
                    'dist/js/nittro-page.js': NittroPage,
                    'dist/js/nittro-page.full.js': [
                        'bower_components/promiz/promiz.js',
                        'bower_components/nittro-core/dist/js/nittro-core.js'
                    ].concat(
                        NittroPage,
                        'src/js/bootstrap.js'
                    )
                }
            }
        },

        less: {
            min: {
                options: {
                    compress: true
                },
                files: {
                    'dist/css/nittro-page.min.css': [
                        'src/css/flashes.less',
                        'src/css/transitions.less'
                    ]
                }
            },
            full: {
                options: {
                    compress: false
                },
                files: {
                    'dist/css/nittro-page.css': [
                        'src/css/flashes.less',
                        'src/css/transitions.less'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.registerTask('default', ['uglify', 'concat', 'less']);

};
