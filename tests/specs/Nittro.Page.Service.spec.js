describe('Nittro.Page.Service', function () {

    var Page, SnippetManager, SnippetAgent, Ajax, AjaxAgent, HistoryAgent, History, TransitionAgent, MockRequest,
        snippetManager,
        snippetAgent,
        mockAjax,
        ajaxAgent,
        historyAgent,
        history,
        transitionAgent,
        testInstance,
        testContainer;

    beforeAll(function () {
        Page = _context.lookup('Nittro.Page.Service');
        SnippetManager = _context.lookup('Nittro.Page.SnippetManager');
        SnippetAgent = _context.lookup('Nittro.Page.SnippetAgent');
        Ajax = _context.lookup('Mocks.Ajax.Service');
        AjaxAgent = _context.lookup('Nittro.Page.AjaxAgent');
        HistoryAgent = _context.lookup('Nittro.Page.HistoryAgent');
        History = _context.lookup('Nittro.Page.History');
        TransitionAgent = _context.lookup('Nittro.Page.TransitionAgent');
        MockRequest = _context.lookup('Mocks.Ajax.Request');

        snippetManager = new SnippetManager();
        snippetAgent = new SnippetAgent(snippetManager);
        mockAjax = new Ajax();
        ajaxAgent = new AjaxAgent(mockAjax);
        history = new History();
        historyAgent = new HistoryAgent(history);
        transitionAgent = new TransitionAgent();
        testInstance = new Page(ajaxAgent, snippetAgent, historyAgent, snippetManager, history);

        testInstance.on('transaction-created', function (evt) {
            transitionAgent.initTransaction(evt.data.transaction, evt.data.context);
        });

        testContainer = document.createElement('div');
        document.body.appendChild(testContainer);

        testContainer.innerHTML = '<div id="snippet-test" class="nittro-transition-fade"><h2>Test snippet</h2></div>';

    });

    afterAll(function () {
        document.body.removeChild(testContainer);
        testContainer = null;
    });



    describe('open()', function () {
        it('should load an URL', function (done) {
            var payload = {
                snippets: {
                    'snippet-test': '<h2>Response loaded</h2><a href="/test-openLink" id="test-link" data-transition="#snippet-test">Test link</a>'
                }
            };
            mockAjax.requests.push(new MockRequest('/test-open-1', 'GET', {}, { payload: payload }));

            testInstance.open('/test-open-1').then(function () {
                expect(testContainer.querySelector('#snippet-test > h2').textContent).toBe('Response loaded');
                done();
            }, function () {
                done.fail('Response wasn\'t loaded: ');
            });
        });

        it('should update the browser history by default', function (done) {
            mockAjax.requests.push(new MockRequest('/test-open-2', 'GET', {}, {}));

            testInstance.open('/test-open-2').then(function () {
                expect(document.location.href).toMatch(/\/test-open-2$/);
                done();
            }, function () {
                done.fail('Response wasn\'t loaded: ');
            });
        });

        it('should respect the "postGet" flag in payload when updating history', function (done) {
            mockAjax.requests.push(new MockRequest('/test-open-3', 'GET', {}, { payload: { postGet: true, url: '/test-open-3-pg' } }));

            testInstance.open('/test-open-3').then(function () {
                expect(document.location.href).toMatch(/\/test-open-3-pg$/);
                done();
            }, function () {
                done.fail('Response wasn\'t loaded: ');
            });
        });

        it('should not update the browser history if the "history" option is set to false', function (done) {
            mockAjax.requests.push(new MockRequest('/test-open-4', 'GET', { history: false }, {}));

            testInstance.open('/test-open-4').then(function () {
                expect(document.location.href).toMatch(/\/test-open-3-pg$/);
                done();
            }, function () {
                done.fail('Response wasn\'t loaded: ');
            });
        });

        it('should not update the browser history if the request is a background request', function (done) {
            mockAjax.requests.push(new MockRequest('/test-open-5', 'GET', { background: false }, {}));

            testInstance.open('/test-open-5').then(function () {
                expect(document.location.href).toMatch(/\/test-open-3-pg$/);
                done();
            }, function () {
                done.fail('Response wasn\'t loaded: ');
            });
        });
    });

    describe('openLink()', function () {
        it('should open a link, performing any associated transitions', function (done) {
            var payload = {
                snippets: {
                    'snippet-test': '<h2>Another one bites the dust</h2>'
                }
            };

            mockAjax.requests.push(new MockRequest('/test-openLink', 'GET', {}, { payload: payload }));

            testInstance.openLink(document.getElementById('test-link'))
                .then(function () {
                    window.setTimeout(function() {
                        if (parseFloat(window.getComputedStyle(testContainer.firstChild).opacity) === 1) {
                            done.fail('Transition wasn\'t applied');
                            return;
                        }

                        expect(testContainer.querySelector('#snippet-test > h2').textContent).toBe('Another one bites the dust');
                        done();
                    }, 100);
                }, function () {
                    done.fail('Response wasn\'t loaded');
                });

        });
    });

    describe('dynamic snippets', function () {
        it('should be appended by default', function (done) {
            testContainer.innerHTML = '<div id="snippet-test-dynamic" class="nittro-snippet-container" data-dynamic-mask="snippet-dynamic-\\d+"></div>';

            var payload = {
                snippets: {
                    'snippet-dynamic-1': 'Dynamic #1',
                    'snippet-dynamic-2': 'Dynamic #2',
                    'snippet-dynamic-3': 'Dynamic #3'
                }
            };

            mockAjax.requests.push(new MockRequest('/dynamic', 'GET', {}, { payload: payload }));

            testInstance.open('/dynamic').then(function () {
                expect(testContainer.querySelectorAll('#snippet-test-dynamic > div').length).toBe(3);
                done();
            }, function () {
                done.fail('Response wasn\'t loaded');
            });
        });

        it('should log an error if no matching container is found', function (done) {
            testContainer.innerHTML =
                '<div id="snippet-test-dynamic" class="nittro-snippet-container" data-dynamic-mask="snippet-dynamic-\\d+"></div>'
                + '<div id="snippet-test-static"></div>'
            ;

            var payload = {
                snippets: {
                    'snippet-dummy-1': 'Dummy dynamic snippet with no matching container',
                    'snippet-test-static': 'Static snippet which should be updated regardless'
                }
            };

            spyOn(console, 'error');

            mockAjax.requests.push(new MockRequest('/dynamic', 'GET', {}, { payload: payload }));

            testInstance.open('/dynamic').then(function () {
                expect(testContainer.querySelectorAll('#snippet-test-dynamic > div').length).toBe(0);
                expect(testContainer.querySelector('#snippet-test-static').textContent).toBe(payload.snippets['snippet-test-static']);
                expect(console.error).toHaveBeenCalledWith('Dynamic snippet #snippet-dummy-1 has no container');
                done();
            }, function () {
                done.fail('Response wasn\'t loaded');
            });
        });
    });

});

