describe('Nittro.Page.Service', function () {

    var Page, Transitions, Ajax, FlashMessages,
        mockAjax,
        mockFlashes,
        testInstance,
        testContainer;

    beforeAll(function () {
        Page = _context.lookup('Nittro.Page.Service');
        Transitions = _context.lookup('Nittro.Page.Transitions');
        Ajax = _context.lookup('Mocks.Ajax.Service');
        FlashMessages = _context.lookup('Mocks.Widgets.FlashMessages');

        mockAjax = new Ajax();
        mockFlashes = new FlashMessages();
        testInstance = new Page(mockAjax, new Transitions(200), mockFlashes);

        testContainer = document.createElement('div');
        document.body.appendChild(testContainer);

        testContainer.innerHTML = '<div id="snippet-test" class="transition-fade transition-auto"><h2>Test snippet</h2></div>';

    });

    afterAll(function () {
        document.body.removeChild(testContainer);
        testContainer = null;
    });



    describe('open()', function () {
        it('should load an URL', function (done) {
            mockAjax.listeners.push(function (request) {
                if (request.getUrl().getPath() !== '/foo') {
                    mockAjax.listeners.pop();
                    done.fail('Invalid request URL: ' + request.getUrl());
                    return;

                }

                request.response.options.fail = false;

                request.response.setResponse(200, {
                    snippets: {
                        'snippet-test': '<h2>Response loaded</h2><a href="/bar" id="test-link" class="ajax" data-transition="#snippet-test">Test link</a>'
                    }
                }, { });
            });

            testInstance.open('/foo').then(function () {
                mockAjax.listeners.pop();
                expect(testContainer.querySelector('#snippet-test > h2').textContent).toBe('Response loaded');
                done();
            }, function () {
                mockAjax.listeners.pop();
                done.fail('Response wasn\'t loaded');
            });
        });
    });

    describe('openLink()', function () {
        it('should open a link, performing any associated transitions', function (done) {
            mockAjax.listeners.push(function (request) {
                if (request.getUrl().getPath() !== '/bar') {
                    mockAjax.listeners.pop();
                    done.fail('Invalid request url: ' + request.getUrl());
                    return;

                }

                request.response.options.fail = false;
                request.response.options.delay = 500;

                request.response.setResponse(200, {
                    snippets: {
                        'snippet-test': '<h2>Another one bites the dust</h2>'
                    }
                }, { });
            });

            testInstance.openLink(document.getElementById('test-link'))
                .then(function () {
                    if (parseFloat(window.getComputedStyle(testContainer.firstChild).opacity) !== 0) {
                        mockAjax.listeners.pop();
                        done.fail('Transition wasn\'t applied');
                        return;
                    }

                    mockAjax.listeners.pop();
                    expect(testContainer.querySelector('#snippet-test > h2').textContent).toBe('Another one bites the dust');
                    done();

                }, function () {
                    mockAjax.listeners.pop();
                    done.fail('Response wasn\'t loaded');
                });

        });
    });

    describe('dynamic snippets', function () {
        it('should be appended by default', function (done) {
            testContainer.innerHTML = '<div id="snippet-test-dynamic" class="snippet-container" data-dynamic-mask="snippet-dynamic-\\d+"></div>';

            mockAjax.listeners.push(function (request) {
                if (request.getUrl().getPath() !== '/dynamic') {
                    mockAjax.listeners.pop();
                    done.fail('Invalid request URL: ' + request.getUrl());
                    return;

                }

                request.response.options.fail = false;

                request.response.setResponse(200, {
                    snippets: {
                        'snippet-dynamic-1': 'Dynamic #1',
                        'snippet-dynamic-2': 'Dynamic #2',
                        'snippet-dynamic-3': 'Dynamic #3'
                    }
                }, { });
            });

            testInstance.open('/dynamic').then(function () {
                mockAjax.listeners.pop();
                expect(testContainer.querySelectorAll('#snippet-test-dynamic > div').length).toBe(3);
                done();
            }, function () {
                mockAjax.listeners.pop();
                done.fail('Response wasn\'t loaded');
            });
        });
    });

});

