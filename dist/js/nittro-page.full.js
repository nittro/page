(function () {
  global = this

  var queueId = 1
  var queue = {}
  var isRunningTask = false

  if (!global.setImmediate)
    global.addEventListener('message', function (e) {
      if (e.source == global){
        if (isRunningTask)
          nextTick(queue[e.data])
        else {
          isRunningTask = true
          try {
            queue[e.data]()
          } catch (e) {}

          delete queue[e.data]
          isRunningTask = false
        }
      }
    })

  function nextTick(fn) {
    if (global.setImmediate) setImmediate(fn)
    // if inside of web worker
    else if (global.importScripts) setTimeout(fn)
    else {
      queueId++
      queue[queueId] = fn
      global.postMessage(queueId, '*')
    }
  }

  Deferred.resolve = function (value) {
    if (!(this._d == 1))
      throw TypeError()

    if (value instanceof Deferred)
      return value

    return new Deferred(function (resolve) {
        resolve(value)
    })
  }

  Deferred.reject = function (value) {
    if (!(this._d == 1))
      throw TypeError()

    return new Deferred(function (resolve, reject) {
        reject(value)
    })
  }

  Deferred.all = function (arr) {
    if (!(this._d == 1))
      throw TypeError()

    if (!(arr instanceof Array))
      return Deferred.reject(TypeError())

    var d = new Deferred()

    function done(e, v) {
      if (v)
        return d.resolve(v)

      if (e)
        return d.reject(e)

      var unresolved = arr.reduce(function (cnt, v) {
        if (v && v.then)
          return cnt + 1
        return cnt
      }, 0)

      if(unresolved == 0)
        d.resolve(arr)

      arr.map(function (v, i) {
        if (v && v.then)
          v.then(function (r) {
            arr[i] = r
            done()
            return r
          }, done)
      })
    }

    done()

    return d
  }

  Deferred.race = function (arr) {
    if (!(this._d == 1))
      throw TypeError()

    if (!(arr instanceof Array))
      return Deferred.reject(TypeError())

    if (arr.length == 0)
      return new Deferred()

    var d = new Deferred()

    function done(e, v) {
      if (v)
        return d.resolve(v)

      if (e)
        return d.reject(e)

      var unresolved = arr.reduce(function (cnt, v) {
        if (v && v.then)
          return cnt + 1
        return cnt
      }, 0)

      if(unresolved == 0)
        d.resolve(arr)

      arr.map(function (v, i) {
        if (v && v.then)
          v.then(function (r) {
            done(null, r)
          }, done)
      })
    }

    done()

    return d
  }

  Deferred._d = 1


  /**
   * @constructor
   */
  function Deferred(resolver) {
    'use strict'
    if (typeof resolver != 'function' && resolver != undefined)
      throw TypeError()

    if (typeof this != 'object' || (this && this.then))
      throw TypeError()

    // states
    // 0: pending
    // 1: resolving
    // 2: rejecting
    // 3: resolved
    // 4: rejected
    var self = this,
      state = 0,
      val = 0,
      next = [],
      fn, er;

    self['promise'] = self

    self['resolve'] = function (v) {
      fn = self.fn
      er = self.er
      if (!state) {
        val = v
        state = 1

        nextTick(fire)
      }
      return self
    }

    self['reject'] = function (v) {
      fn = self.fn
      er = self.er
      if (!state) {
        val = v
        state = 2

        nextTick(fire)

      }
      return self
    }

    self['_d'] = 1

    self['then'] = function (_fn, _er) {
      if (!(this._d == 1))
        throw TypeError()

      var d = new Deferred()

      d.fn = _fn
      d.er = _er
      if (state == 3) {
        d.resolve(val)
      }
      else if (state == 4) {
        d.reject(val)
      }
      else {
        next.push(d)
      }

      return d
    }

    self['catch'] = function (_er) {
      return self['then'](null, _er)
    }

    var finish = function (type) {
      state = type || 4
      next.map(function (p) {
        state == 3 && p.resolve(val) || p.reject(val)
      })
    }

    try {
      if (typeof resolver == 'function')
        resolver(self['resolve'], self['reject'])
    } catch (e) {
      self['reject'](e)
    }

    return self

    // ref : reference to 'then' function
    // cb, ec, cn : successCallback, failureCallback, notThennableCallback
    function thennable (ref, cb, ec, cn) {
      // Promises can be rejected with other promises, which should pass through
      if (state == 2) {
        return cn()
      }
      if ((typeof val == 'object' || typeof val == 'function') && typeof ref == 'function') {
        try {

          // cnt protects against abuse calls from spec checker
          var cnt = 0
          ref.call(val, function (v) {
            if (cnt++) return
            val = v
            cb()
          }, function (v) {
            if (cnt++) return
            val = v
            ec()
          })
        } catch (e) {
          val = e
          ec()
        }
      } else {
        cn()
      }
    };

    function fire() {

      // check if it's a thenable
      var ref;
      try {
        ref = val && val.then
      } catch (e) {
        val = e
        state = 2
        return fire()
      }

      thennable(ref, function () {
        state = 1
        fire()
      }, function () {
        state = 2
        fire()
      }, function () {
        try {
          if (state == 1 && typeof fn == 'function') {
            val = fn(val)
          }

          else if (state == 2 && typeof er == 'function') {
            val = er(val)
            state = 1
          }
        } catch (e) {
          val = e
          return finish()
        }

        if (val == self) {
          val = TypeError()
          finish()
        } else thennable(ref, function () {
            finish(3)
          }, finish, function () {
            finish(state == 1 && 3)
          })

      })
    }


  }

  // Export our library object, either for node.js or as a globally scoped variable
  if (typeof module != 'undefined') {
    module['exports'] = Deferred
  } else {
    global['Promise'] = global['Promise'] || Deferred
  }
})()
;
var _context = (function() {
    var t = {},
        api,
        loaded = [],
        loading = {},
        indexOf = Array.prototype.indexOf,
        REQ_TIMEOUT = 30000,
        undefined,
        doc = document,
        loc = doc.location,
        elem = function(n) { return doc.createElement(n); },
        win = window,
        setTimeout = function(c, t) { return win.setTimeout(c, t); },
        clearTimeout = function(t) { return win.clearTimeout(t); },
        promise = Promise;

    if (typeof indexOf !== 'function') {
        indexOf = function(e) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === e) {
                    return i;
                }
            }

            return -1;

        }
    }

    var resolver = null;

    var resolveUrl = function(u) {
        resolver || (resolver = elem('a'));
        resolver.href = u;
        return resolver.href;
    };


    var isRelative = function(u) {
        try {
            var len = /^https?:\/\/.+?(\/|$)/i.exec(loc.href)[0].length;
            return u.substr(0, len) === loc.href.substr(0, len);

        } catch (err) {
            return false;

        }
    };

    var xhrFactory = (function(o, f) {
        while(o.length) {
            try {
                f = o.shift();
                f();

                return f;

            } catch (e) {}
        }

        return function() { throw new Error(); };

    })([
        function() { return new XMLHttpRequest(); },
        function() { return new ActiveXObject('Msxml2.XMLHTTP'); },
        function() { return new ActiveXObject('Msxml3.XMLHTTP'); },
        function() { return new ActiveXObject('Microsoft.XMLHTTP'); }
    ]);

    var xdrFactory = (function() {
        try {
            if ('withCredentials' in new XMLHttpRequest()) {
                return function() { return new XMLHttpRequest(); };

            } else if (win.XDomainRequest !== undefined) {
                return function() { return new win.XDomainRequest(); };

            }

        } catch (err) { }

        return function() { throw new Error(); };

    })();

    var xhr = function(u) {
        return new promise(function(fulfill, reject) {
            var req,
                m;

            if (isRelative(u)) {
                req = xhrFactory();

            } else {
                req = xdrFactory();

            }

            req.open('GET', u, true);

            var f = function () {
                m && clearTimeout(m);
                fulfill(req);
            };

            var r = function () {
                m && clearTimeout(m);
                reject(req);
            };

            if ('onsuccess' in req) {
                req.onsuccess = f;
                req.onerror = r;

            } else if (win.XDomainRequest !== undefined && req instanceof win.XDomainRequest) {
                req.onload = f;
                req.onerror = r;

            } else {
                req.onreadystatechange = function() {
                    if (req.readyState !== 4) {
                        return;

                    }

                    if (req.status === 200) {
                        f();

                    } else {
                        r();

                    }
                };
            }

            req.send();

            m = setTimeout(function() {
                if (req.readyState && req.readyState < 4) try {
                    req.abort();

                } catch (err) { }

                m = null;
                r();

            }, REQ_TIMEOUT);

        });
    };

    var exec = function(s, t, u) {
        var e;

        if (!t) {
            if (u.match(/\.(?:less|css)/i)) {
                t = 'text/css';

            } else  {
                t = 'text/javascript';

            }
        } else {
            t = t.replace(/\s*;.*$/, '').toLowerCase();

        }

        if (t === 'text/css') {
            e = elem('style');
            e.type = t;

            u = u.replace(/[^\/]+$/, '');
            s = s.replace(/url\s*\(('|")?(?:\.\/)?(.+?)\1\)/, function (m, q, n) {
                q || (q = '"');

                if (n.match(/^(?:(?:https?:)?\/)?\//)) {
                    return 'url(' + q + n + q + ')';

                } else {
                    return 'url(' + q + resolveUrl(u + n) + q + ')';

                }
            });

            if (e.styleSheet) {
                e.styleSheet.cssText = s;

            } else {
                e.appendChild(doc.createTextNode(s));

            }

            doc.head.appendChild(e);

        } else {
            e = elem('script');
            e.type = 'text/javascript';
            e.text = s;
            doc.head.appendChild(e).parentNode.removeChild(e);

        }

    };

    var map = {
        names: [],
        classes: []
    };

    var lookup = function(s, c) {
        var i = map.names.indexOf(s);

        if (i > -1) {
            return map.classes[i];

        }

        var r = t,
            p = s.split('.'),
            n;

        while (p.length) {
            n = p.shift();
            if (r[n] === undefined) {
                if (c) {
                    r[n] = {};

                } else {
                    throw new Error(s + ' not found in context');

                }
            }

            r = r[n];

        }

        map.names.push(s);
        map.classes.push(r);

        return r;

    };

    var lookupClass = function (o) {
        if (typeof o === 'object' && o.constructor !== Object) {
            o = o.constructor;

        }

        if (typeof o !== 'function' && typeof o !== 'object') {
            throw new Error('Cannot lookup class name of non-object');

        }

        var i = map.classes.indexOf(o);

        return i === -1 ? false : map.names[i];

    };



    var load = function () {
        var u, a, p = promise.resolve(true);

        for (a = 0; a < arguments.length; a++) {
            if (typeof arguments[a] === 'function') {
                p = p.then(function(f) {
                    return function () {
                        return invoke(f);

                    };
                }(arguments[a]));

            } else if (typeof arguments[a] === 'string') {
                u = resolveUrl(arguments[a]);

                if (indexOf.call(loaded, u) === -1) {
                    if (loading[u]) {
                        p = p.then(function (p) {
                            return function () {
                                return p;

                            };
                        }(loading[u]));
                    } else {
                        p = loading[u] = function (p, u) {
                            return new promise(function (f, r) {
                                xhr(u).then(function (xhr) {
                                    p.then(function () {
                                        exec(xhr.responseText, xhr.getResponseHeader('Content-Type'), u);
                                        delete loading[u];
                                        loaded.push(u);
                                        f();

                                    }, r);
                                });
                            });

                        }(p, u);
                    }
                }
            }
        }

        return a = {
            then: function (fulfilled, rejected) {
                p.then(function () {
                    fulfilled && invoke(fulfilled);
                }, function () {
                    rejected && invoke(rejected);
                });

                return a;

            }
        };
    };


    var nsStack = [];


    var invoke = function(ns, f, i) {
        if (i === undefined && typeof ns === 'function') {
            i = f;
            f = ns;
            ns = null;

        }

        if (ns) {
            nsStack.unshift(ns, ns = lookup(ns, true));

        } else {
            ns = t;
            nsStack.unshift(null, ns);

        }

        var params = f.length ? f.toString().match(/^function\s*\((.*?)\)/i)[1].split(/\s*,\s*/) : [],
            args = [],
            p, c, r;

        for (p = 0; p < params.length; p++) {
            if (params[p] === 'context') {
                args.push(api);

            } else if (params[p] === '_NS_') {
                args.push(ns);

            } else if (params[p] === 'undefined') {
                args.push(undefined);

            } else if (i !== undefined && params[p] in i) {
                c = i[params[p]];

                if (typeof c === 'string') {
                    c = lookup(c);

                }

                args.push(c);

            } else if (ns[params[p]] !== undefined) {
                args.push(ns[params[p]]);

            } else if (t[params[p]] !== undefined) {
                args.push(t[params[p]]);

            } else {
                throw new Error('"' + params[p] + '" not found in context');

            }
        }

        r = f.apply(ns, args);

        nsStack.shift();
        nsStack.shift();
        return r;

    };

    var register = function (constructor, name) {
        var ns = name.split(/\./g),
            key = ns.pop();

        if (ns.length) {
            ns = lookup(ns.join('.'), true);

        } else {
            if (nsStack.length && nsStack[0] !== null) {
                name = nsStack[0] + '.' + name;
                ns = nsStack[1];

            } else {
                ns = t;

            }
        }

        ns[key] = constructor;

        map.names.push(name);
        map.classes.push(constructor);
        return api;

    };

    var __ns = function () {
        if (arguments.length) {
            nsStack.unshift(arguments[0], arguments[1]);

        } else {
            nsStack.shift();
            nsStack.shift();
        }
    };

    var extend = function (parent, constructor, proto) {
        if (!proto) {
            proto = constructor;
            constructor = parent;
            parent = null;

        }

        if (!parent) {
            parent = Object;

        } else if (typeof parent === 'string') {
            parent = lookup(parent);

        }

        var tmp = function () {};
        tmp.prototype = parent.prototype;
        constructor.prototype = new tmp();
        constructor.prototype.constructor = constructor;
        constructor.Super = parent;

        if (proto) {
            if (proto.hasOwnProperty('STATIC') && proto.STATIC) {
                copyProps(constructor, proto.STATIC);

            }

            copyProps(constructor.prototype, proto);

        }

        return constructor;

    };

    var mixin = function (target, source, map) {
        if (typeof source === 'string') {
            source = lookup(source);

        }

        copyProps(target.prototype, source, map);
        return target;

    };

    var copyProps = function (target, source, map) {
        var key;

        for (key in source) {
            if (source.hasOwnProperty(key) && key !== 'STATIC') {
                target[map && key in map ? map[key] : key] = source[key];

            }
        }
    };

    return api = {
        lookup: lookup,
        lookupClass: lookupClass,
        invoke: invoke,
        load: load,
        extend: extend,
        mixin: mixin,
        register: register,
        __ns: __ns
    };

})();
;
_context.invoke('Utils', function(undefined) {

    var Strings = {
        applyModifiers: function(s) {
            var f = Array.prototype.slice.call(arguments, 1),
                i = 0,
                a, m;

            for (; i < f.length; i++) {
                a = f[i].split(':');
                m = a.shift();
                a.unshift(s);
                s = Strings[m].apply(Strings, a);

            }

            return s;

        },

        toString: function(s) {
            return s === undefined ? 'undefined' : (typeof s === 'string' ? s : (s.toString !== undefined ? s.toString() : Object.prototype.toString.call(s)));

        },

        sprintf: function(s) {
            return Strings.vsprintf(s, Array.prototype.slice.call(arguments, 1));

        },

        vsprintf: function(s, args) {
            var n = 0;

            return s.replace(/%(?:(\d+)\$)?(\.\d+|\[.*?:.*?\])?([idsfa%])/g, function(m, a, p, f) {
                if (f === '%') {
                    return f;

                }

                a = a ? parseInt(a) - 1 : n++;

                if (args[a] === undefined) {
                    throw new Error('Missing parameter #' + (a + 1));

                }

                a = args[a];

                switch (f) {
                    case 's':
                        return Strings.toString(a);

                    case 'i':
                    case 'd':
                        return parseInt(a);

                    case 'f':
                        a = parseFloat(a);

                        if (p && p.match(/^\.\d+$/)) {
                            a = a.toFixed(parseInt(p.substr(1)));

                        }

                        return a;

                    case 'a':
                        p = p && p.match(/^\[.*:.*\]$/) ? p.substr(1, p.length - 2).split(':') : [', ', ', '];
                        return a.length === 0 ? '' : a.slice(0, -1).join(p[0]) + (a.length > 1 ? p[1] : '') + a[a.length - 1];

                }

                return m;

            });
        },

        webalize: function(s, chars, ws) {
            if (ws) {
                s = s.replace(/\s+/g, '_');

            }

            s = s.replace(new RegExp('[^_A-Za-z\u00C0-\u017F' + Strings.escapeRegex(chars || '').replace(/\\-/g, '-') + ']+', 'g'), '-');

            return Strings.trim(s, '_-');

        },

        escapeRegex: function(s) {
            return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

        },

        split: function(s, re, offsetCapture, noEmpty, delimCapture) {
            if (re instanceof RegExp) {
                re = new RegExp(re.source, [re.ignoreCase ? 'i' : '', re.multiline ? 'm' : '', 'g'].filter(function(v) { return !!v; }).join(''))

            } else {
                re = new RegExp(re, 'g');

            }

            var r = [],
                len = 0;

            s = s.replace(re, function(m, p, ofs) {
                ofs = arguments[arguments.length - 2];
                p = s.substring(len, ofs);

                if (p.length && !p.match(/^[\t ]+$/) || !noEmpty) {
                    r.push(offsetCapture ? [p, len] : s.substring(len, ofs));

                }

                if (delimCapture && (m.length && !m.match(/^[\t ]+$/) || !noEmpty)) {
                    r.push(offsetCapture ? [m, ofs] : m);

                }

                len = ofs + m.length;

                return m;

            });

            if (len < s.length || !noEmpty) {
                s = s.substring(len);
                (!noEmpty || (s.length && !s.match(/^[\t ]+$/))) && r.push(offsetCapture ? [s, len] : s);

            }

            return r;

        },

        trim: function(s, c) {
            return Strings._trim(s, c, true, true);

        },

        trimLeft: function(s, c) {
            return Strings._trim(s, c, true, false);

        },

        trimRight: function(s, c) {
            return Strings._trim(s, c, false, true);

        },

        _trim: function (s, c, l, r) {
            if (!c) {
                c = " \t\n\r\0\x0B\xC2\xA0";

            }

            var re = [];
            c = '[' + Strings.escapeRegex(c) + ']+';
            l && re.push('^', c);
            l && r && re.push('|');
            r && re.push(c, '$');

            return s.replace(new RegExp(re.join(''), 'ig'), '');

        },

        firstUpper: function(s) {
            return s.substr(0, 1).toUpperCase() + s.substr(1);

        },

        compare: function(a, b, len) {
            if (typeof a !== "string" || typeof b !== 'string') {
                return false;

            }

            if (!len) {
                len = Math.min(a.length, b.length);

            }

            return a.substr(0, len).toLowerCase() === b.substr(0, len).toLowerCase();

        },

        contains: function(h, n) {
            return h.indexOf(n) !== -1;

        },

        isNumeric: function(s) {
            return Object.prototype.toString.call(s) !== '[object Array]' && (s - parseFloat(s) + 1) >= 0;

        },

        escapeHtml: function(s) {
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        },

        nl2br: function(s, collapse) {
            return s.replace(collapse ? /\n+/g : /\n/g, '<br />');

        },

        random: function(len, chars) {
            chars = (chars || 'a-z0-9').replace(/.-./g, function(m, a, b) {
                a = m.charCodeAt(0);
                b = m.charCodeAt(2);
                var n = Math.abs(b - a),
                    c = new Array(n),
                    o = Math.min(a, b),
                    i = 0;

                for (; i <= n; i++) {
                    c[i] = o + i;
                }

                return String.fromCharCode.apply(null, c);

            });

            len || (len = 8);

            var s = new Array(len),
                n = chars.length - 1,
                i;

            for (i = 0; i < len; i++) {
                s[i] = chars[Math.round(Math.random() * n)];

            }

            return s.join('');

        }
    };

    _context.register(Strings, 'Strings');

});
;
_context.invoke('Utils', function(undefined) {

    var Arrays = {
        isArray: function(a) {
            return a && a.constructor === Array;

        },

        isArrayLike: function(a) {
            return typeof a === 'object' && a.length !== undefined;

        },

        shuffle: function (a) {
            var c = a.length, t, i;

            // While there are elements in the array
            while (c--) {
                // Pick a random index
                i = (Math.random() * c) | 0;

                // And swap the last element with it
                t = a[c];
                a[c] = a[i];
                a[i] = t;
            }

            return a;

        },

        createFrom: function(a, s, e) {
            if (a.length === undefined) {
                throw new Error('Invalid argument, only array-like objects can be supplied');

            }

            return Array.prototype.slice.call(a, s || 0, e || a.length);

        },

        getKeys: function(a) {
            var keys = [], k;

            if (Arrays.isArray(a)) {
                for (k = 0; k < a.length; k++) {
                    keys.push(k);

                }
            } else {
                for (k in a) {
                    keys.push(k);

                }
            }

            return keys;

        },

        filterKeys: function() {
            var args = Arrays.createFrom(arguments),
                t = args.shift(),
                a, i, r = {}, rem;

            rem = function(k) {
                if (r[k] === undefined) {
                    r[k] = t[k];
                    delete t[k];

                }
            };

            while (args.length) {
                a = args.shift();

                if (typeof a === 'object') {
                    if (a instanceof Array) {
                        for (i = 0; i < a.length; i++) {
                            rem(a[i]);

                        }
                    } else {
                        for (i in a) {
                            rem(i);

                        }
                    }
                } else {
                    rem(a);

                }
            }
        },

        getValues: function(a) {
            var arr = [], k;

            for (k in a) {
                arr.push(a[k]);

            }

            return arr;

        },

        merge: function() {
            var args = Arrays.createFrom(arguments),
                a = args.shift(),
                r = false,
                b, i;

            if (typeof a === 'boolean') {
                r = a;
                a = args.shift();

            }

            if (!a) {
                a = [];
            }

            while (args.length) {
                b = args.shift();
                if (b instanceof Array) {
                    for (i = 0; i < b.length; i++) {
                        if (r && typeof b[i] === 'object' && Object.prototype.toString.call(b[i]) === '[object Object]') {
                            a.push(Arrays.mergeTree(r, {}, b[i]));

                        } else {
                            a.push(b[i]);

                        }
                    }
                }
            }

            return a;

        },

        mergeTree: function() {
            var r = false,
                args = Arrays.createFrom(arguments),
                ofs = 1,
                t = args.shift(),
                props = [];

            if (typeof t === 'boolean') {
                r = t;
                t = args.shift();
                ofs = 2;

            }

            while (args.length) {
                var o = args.pop(),
                    p, a, i;

                if (typeof o !== 'object' || o === null) {
                    continue;

                }

                if (!t) {
                    t = {};

                }

                for (p in o) {
                    if (!o.hasOwnProperty(p) || props.indexOf(p) !== -1) {
                        continue;

                    }

                    if (typeof o[p] === 'object') {
                        if (r) {
                            if (o[p] instanceof Array) {
                                a = [r, t[p] || null];

                                for (i = ofs; i < arguments.length; i++) {
                                    a.push(arguments[i][p] || null);

                                }

                                t[p] = Arrays.merge.apply(this, a);

                            } else {
                                a = [r, null];

                                for (i = ofs; i < arguments.length; i++) {
                                    a.push(arguments[i] ? arguments[i][p] || null : null);

                                }

                                t[p] = Arrays.mergeTree.apply(this, a) || t[p];

                            }

                        } else {
                            t[p] = t[p] === undefined ? o[p] : (o[p] === null ? t[p] : o[p]);

                        }
                    } else {
                        t[p] = o[p];

                    }

                    props.push(p);

                }
            }

            return t;

        },

        walk: function(r, a, f) {
            if (typeof r !== "boolean") {
                f = a;
                a = r;
                r = false;
            }

            var i,
                p = function(k, v) {
                    if (r && (v instanceof Array || v instanceof Object)) {
                        Arrays.walk(r, v, f);

                    } else {
                        f.call(v, k, v);

                    }
                };

            if (a instanceof Array) {
                for (i = 0; i < a.length; i++) {
                    p(i, a[i]);

                }
            } else if (a instanceof Object) {
                for (i in a) {
                    p(i, a[i]);

                }
            } else {
                p(null, a);

            }
        }
    };

    _context.register(Arrays, 'Arrays');

});
;
_context.invoke('Utils', function (Arrays, undefined) {

    var HashMap = _context.extend(function (src) {
        this._ = {
            keys: [],
            values: [],
            nonNumeric: 0,
            nextNumeric: 0
        };

        if (src) {
            this.merge(src);

        }
    }, {
        STATIC: {
            from: function (data, keys) {
                if (!keys) {
                    return data instanceof HashMap ? data.clone() : new HashMap(data);

                } else if (!Arrays.isArray(keys)) {
                    throw new Error('Invalid argument supplied to HashMap.from(): the second argument must be an array');

                }

                var map = new HashMap(),
                    i, n = keys.length,
                    k,
                    arr = Arrays.isArray(data);

                for (i = 0; i < n; i++) {
                    k = arr ? i : keys[i];

                    if (data[k] !== undefined) {
                        map.set(keys[i], data[k]);

                    }
                }

                return map;

            }
        },

        length: 0,

        isList: function () {
            return this._.nonNumeric === 0;

        },

        clone: function (deep) {
            var o = new HashMap();
            o._.keys = this._.keys.slice();
            o._.nextNumeric = this._.nextNumeric;
            o.length = this.length;

            if (deep) {
                o._.values = this._.values.map(function (v) {
                    return v instanceof HashMap ? v.clone(deep) : v;
                });
            } else {
                o._.values = this._.values.slice();

            }

            return o;

        },

        merge: function (src) {
            if (src instanceof HashMap || Arrays.isArray(src)) {
                src.forEach(function(value, key) { this.set(key, value); }, this);

            } else if (typeof src === 'object' && src !== null) {
                for (var k in src) {
                    if (src.hasOwnProperty(k)) {
                        this.set(k, src[k]);

                    }
                }
            } else {
                throw new TypeError('HashMap.merge() expects the first argument to be an array or an object, ' + (typeof src) + ' given');

            }

            return this;

        },

        append: function (src) {
            if (src instanceof HashMap || Arrays.isArray(src)) {
                src.forEach(function (value, key) {
                    if (typeof key === 'number') {
                        this.push(value);

                    } else {
                        this.set(key, value);

                    }
                }, this);
            } else {
                this.merge(src);

            }

            return this;

        },

        push: function (value) {
            for (var i = 0; i < arguments.length; i++) {
                this._.keys.push(this._.nextNumeric);
                this._.values.push(arguments[i]);
                this._.nextNumeric++;
                this.length++;

            }

            return this;

        },

        pop: function () {
            if (!this.length) {
                return null;

            }

            var k = this._.keys.pop();

            if (typeof k === 'number') {
                if (k + 1 === this._.nextNumeric) {
                    this._.nextNumeric--;

                }
            } else {
                this._.nonNumeric--;

            }

            this.length--;
            return this._.values.pop();

        },

        shift: function () {
            if (!this.length) {
                return null;

            }

            if (typeof this._.keys[0] === 'number') {
                this._.nextNumeric--;
                this._shiftKeys(1, this.length, -1);

            } else {
                this._.nonNumeric--;

            }

            this.length--;
            this._.keys.shift();
            return this._.values.shift();

        },

        unshift: function (value) {
            var values = Arrays.createFrom(arguments),
                n = values.length,
                i = 0,
                keys = new Array(n);

            while (i < n) {
                keys[i] = i++;
            }

            keys.unshift(0, 0);
            values.unshift(0, 0);

            this._shiftKeys(0, this.length, n);
            this._.keys.splice.apply(this._.keys, keys);
            this._.values.splice.apply(this._.values, values);
            this._.nextNumeric += n;
            this.length += n;
            return this;

        },

        slice: function (from, to) {
            (from === undefined) && (from = 0);
            (from < 0) && (from += this.length);
            (to === undefined) && (to = this.length);
            (to < 0) && (to += this.length);

            var o = new HashMap();

            o._.keys = this._.keys.slice(from, to).map(function(k) {
                if (typeof k === 'number') {
                    k = o._.nextNumeric;
                    o._.nextNumeric++;
                    return k;

                } else {
                    o._.nonNumeric++;
                    return k;

                }
            });

            o._.values = this._.values.slice(from, to);
            o.length = o._.keys.length;

            return o;

        },

        splice: function (from, remove) {
            var values = Arrays.createFrom(arguments),
                keys = values.slice().map(function() { return -1; }),
                removed, i;

            keys[0] = values[0];
            keys[1] = values[1];

            this._.keys.splice.apply(this._.keys, keys);
            removed = this._.values.splice.apply(this._.values, values);

            this.length = this._.keys.length;
            this._.nextNumeric = 0;
            this._.nonNumeric = 0;

            for (i = 0; i < this.length; i++) {
                if (typeof this._.keys[i] === 'number') {
                    this._.keys[i] = this._.nextNumeric;
                    this._.nextNumeric++;

                } else {
                    this._.nonNumeric++;

                }
            }

            return removed;

        },

        'set': function (key, value) {
            var i = this._.keys.indexOf(key);

            if (i === -1) {
                this._.keys.push(key);
                this._.values.push(value);
                this.length++;

                if (typeof key === 'number') {
                    if (key >= this._.nextNumeric) {
                        this._.nextNumeric = key + 1;

                    }
                } else {
                    this._.nonNumeric++;

                }
            } else {
                this._.values[i] = value;

            }

            return this;

        },

        'get': function (key, need) {
            var i = this._.keys.indexOf(key);

            if (i > -1) {
                return this._.values[i];

            } else if (need) {
                throw new RangeError('Key ' + key + ' not present in HashMap');

            }

            return null;

        },

        has: function (key) {
            var index = this._.keys.indexOf(key);
            return index > -1 && this._.values[index] !== undefined;

        },

        forEach: function (callback, thisArg) {
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg || null, this._.values[i], this._.keys[i], this);

            }

            return this;

        },

        map: function (callback, recursive, thisArg) {
            return this.clone(recursive).walk(callback, recursive, thisArg);

        },

        walk: function (callback, recursive, thisArg) {
            for (var i = 0; i < this.length; i++) {
                if (recursive && this._.values[i] instanceof HashMap) {
                    this._.values[i].walk(callback, recursive, thisArg);

                } else {
                    this._.values[i] = callback.call(thisArg || null, this._.values[i], this._.keys[i], this);

                }
            }

            return this;

        },

        find: function (predicate, thisArg) {
            var i = this._find(predicate, thisArg, true);
            return i === false ? null : this._.values[i];

        },

        findKey: function (predicate, thisArg) {
            var i = this._find(predicate, thisArg, true);
            return i === false ? null : this._.keys[i];

        },

        some: function (predicate, thisArg) {
            return this._find(predicate, thisArg, true) !== false;

        },

        all: function (predicate, thisArg) {
            return this._find(predicate, thisArg, false) === false;

        },

        filter: function (predicate, thisArg) {
            var o = new HashMap(),
                i;

            for (i = 0; i < this.length; i++) {
                if (predicate.call(thisArg || null, this._.values[i], this._.keys[i], this)) {
                    if (typeof this._.keys[i] === 'number') {
                        o.push(this._.values[i]);

                    } else {
                        o.set(this._.keys[i], this._.values[i]);

                    }
                }
            }

            return o;

        },

        exportData: function () {
            if (this.isList()) {
                return this.getValues().map(function(v) {
                    return v instanceof HashMap ? v.exportData() : v;

                });
            }

            for (var i = 0, r = {}; i < this.length; i++) {
                if (this._.values[i] instanceof HashMap) {
                    r[this._.keys[i]] = this._.values[i].exportData();

                } else {
                    r[this._.keys[i]] = this._.values[i];

                }
            }

            return r;

        },

        getKeys: function () {
            return this._.keys.slice();

        },

        getValues: function () {
            return this._.values.slice();

        },

        _shiftKeys: function (from, to, diff) {
            while (from < to) {
                if (typeof this._.keys[from] === 'number') {
                    this._.keys[from] += diff;

                }

                from++;

            }
        },

        _find: function (predicate, thisArg, expect) {
            for (var i = 0; i < this.length; i++) {
                if (predicate.call(thisArg || null, this._.values[i], this._.keys[i], this) === expect) {
                    return i;

                }
            }

            return false;

        }
    });

    _context.register(HashMap, 'HashMap');

});
;
_context.invoke('Utils', function(Strings, undefined) {

    var Url = function(s) {
        var cur = document.location.href.match(Url.PARSER_REGEXP),
			src = s === null || s === '' || s === undefined ? cur : s.match(Url.PARSER_REGEXP),
            noHost = !src[4],
            path = src[6] || '';

        if (noHost && path.charAt(0) !== '/') {
            if (path.length) {
                path = Url.getDirName(cur[6] || '') + '/' + path.replace(/^\.\//, '');

            } else {
                path = cur[6];

            }
        }

        this._ = {
            protocol: src[1] || cur[1] || '',
            username: (noHost ? src[2] || cur[2] : src[2]) || '',
            password: (noHost ? src[3] || cur[3] : src[3]) || '',
            hostname: src[4] || cur[4] || '',
            port: (noHost ? src[5] || cur[5] : src[5]) || '',
            path: path,
            params: Url.parseQuery((noHost && !src[6] ? src[7] || cur[7] : src[7]) || ''),
            hash: (noHost && !src[6] && !src[7] ? src[8] || cur[8] : src[8]) || ''
        };
    };

    Url.prototype.getProtocol = function() {
        return this._.protocol;

    };

    Url.prototype.getUsername = function() {
        return this._.username;

    };

    Url.prototype.getPassword = function() {
        return this._.password;

    };

    Url.prototype.getHostname = function() {
        return this._.hostname;

    };

    Url.prototype.getPort = function() {
        return this._.port;

    };

    Url.prototype.getAuthority = function() {
        var a = '';

        if (this._.username) {
            if (this._.password) {
                a += this._.username + ':' + this._.password + '@';

            } else {
                a += this._.username + '@';

            }
        }

        a += this._.hostname;

        if (this._.port) {
            a += ':' + this._.port;

        }

        return a;

    };

    Url.prototype.getPath = function() {
        return this._.path;

    };

    Url.prototype.getQuery = function() {
        var q = Url.buildQuery(this._.params);
        return q.length ? '?' + q : '';

    };

    Url.prototype.getParam = function(n) {
        return this._.params[n];

    };

    Url.prototype.hasParam = function(n) {
        return this._.params[n] !== undefined;

    };

    Url.prototype.getParams = function() {
        return this._.params;

    };

    Url.prototype.getHash = function() {
        return this._.hash;

    };


    Url.prototype.setProtocol = function(protocol) {
        this._.protocol = protocol ? Strings.trimRight(protocol, ':') + ':' : '';
        return this;

    };

    Url.prototype.setUsername = function(username) {
        this._.username = username;
        return this;

    };

    Url.prototype.setPassword = function(password) {
        this._.password = password;
        return this;

    };

    Url.prototype.setHostname = function(hostname) {
        this._.hostname = hostname;
        return this;

    };

    Url.prototype.setPort = function(port) {
        this._.port = port;
        return this;

    };

    Url.prototype.setPath = function(path) {
        this._.path = path ? '/' + Strings.trimLeft(path, '/') : '';
        return this;

    };

    Url.prototype.setQuery = function(query) {
        this._.params = Url.parseQuery(query);
        return this;

    };

    Url.prototype.setParam = function(n, v) {
        this._.params[n] = v;
        return this;

    };

    Url.prototype.addParams = function(p) {
        if (p instanceof Array && (p.length < 1 || 'name' in p[0])) {
            for (var i = 0; i < p.length; i++) {
                this._.params[p[i].name] = p[i].value;

            }
        } else {
            for (var k in p) {
                if (p[k] !== undefined) {
                    this._.params[k] = p[k];

                }
            }
        }

        return this;

    };

    Url.prototype.getParams = function () {
        return this._.params;

    };

    Url.prototype.setParams = function(p) {
        this._.params = {};
        this.addParams(p);
        return this;

    };

    Url.prototype.removeParam = function(n) {
        delete this._.params[n];
        return this;

    };

    Url.prototype.setHash = function(hash) {
        this._.hash = hash ? '#' + Strings.trimLeft(hash, '#') : '';
        return this;

    };


    Url.prototype.toAbsolute = function() {
        return this._.protocol + '//' + this.getAuthority() + this._.path + this.getQuery() + this._.hash;

    };

    Url.prototype.toLocal = function () {
        return this._.path + this.getQuery() + this._.hash;

    };

    Url.prototype.toRelative = function(to) {
        to = Url.from(to || document.location.href);

        if (to.getProtocol() !== this.getProtocol()) {
            return this.toAbsolute();

        }

        if (to.getAuthority() !== this.getAuthority()) {
            return '//' + this.getAuthority() + this.getPath() + this.getQuery() + this.getHash();

        }

        if (to.getPath() !== this.getPath()) {
            return Url.getRelativePath(to.getPath(), this.getPath()) + this.getQuery() + this.getHash();

        }

        var qto = to.getQuery(), qthis = this.getQuery();
        if (qto !== qthis) {
            return qthis + this.getHash();

        }

        return to.getHash() === this.getHash() ? '' : this.getHash();

    };

    Url.prototype.toString = function() {
        return this.toAbsolute();

    };

    Url.prototype.isLocal = function() {
        return this.compare(Url.fromCurrent()) < Url.PART.PORT;

    };

    Url.prototype.compare = function(to) {
        if (!(to instanceof Url)) {
            to = Url.from(to);

        }

        var r = 0;

        this.getProtocol() !== to.getProtocol() && (r |= Url.PART.PROTOCOL);
        this.getUsername() !== to.getUsername() && (r |= Url.PART.USERNAME);
        this.getPassword() !== to.getPassword() && (r |= Url.PART.PASSWORD);
        this.getHostname() !== to.getHostname() && (r |= Url.PART.HOSTNAME);
        this.getPort() !== to.getPort() && (r |= Url.PART.PORT);
        this.getPath() !== to.getPath() && (r |= Url.PART.PATH);
        this.getQuery() !== to.getQuery() && (r |= Url.PART.QUERY);
        this.getHash() !== to.getHash() && (r |= Url.PART.HASH);

        return r;

    };

    /**
     * 1: protocol
     * 2: user
     * 3: pass
     * 4: host
     * 5: port
     * 6: path
     * 7: query
     * 8: hash
     * @type {RegExp}
     */
    Url.PARSER_REGEXP = /^(?:([^:/]+:)?\/\/(?:([^\/@]+?)(?::([^\/@]+))?@)?(?:([^/]+?)(?::(\d+))?(?=\/|$))?)?(.*?)(\?.*?)?(#.*)?$/;
    Url.PART = {
        PROTOCOL: 128,
        USERNAME: 64,
        PASSWORD: 32,
        HOSTNAME: 16,
        PORT: 8,
        PATH: 4,
        QUERY: 2,
        HASH: 1
    };

    Url.from = function(s) {
        return s instanceof Url ? new Url(s.toAbsolute()) : new Url(typeof s === 'string' || s === null || s === undefined ? s : Strings.toString(s));

    };

    Url.fromCurrent = function() {
        return new Url();

    };

    Url.getDirName = function (path) {
        return path.replace(/(^|\/)[^\/]*$/, '');

    };

    Url.getRelativePath = function(from, to) {
        from = Strings.trimLeft(from, '/').split('/');
        from.pop(); // last element is either a file or empty because the previous element is a directory

        if (!to.match(/^\//)) {
            return to.replace(/^\.\//, '');

        }

        to = Strings.trimLeft(to, '/').split('/');

        var e = 0,
            f,
            t,
            o = [],
            n = Math.min(from.length, to.length);

        for (; e < n; e++) {
            if (from[e] !== to[e]) {
                break;

            }
        }

        for (f = e; f < from.length; f++) {
            o.push('..');

        }

        for (t = e; t < to.length; t++) {
            o.push(to[t]);

        }

        return o.join('/');

    };

    Url.buildQuery = function(data, pairs) {
        var q = [], n, en = encodeURIComponent;

        function val(v) {
            if (v === undefined) {
                return null;

            } else if (typeof v === 'boolean') {
                return v ? 1 : 0;

            } else {
                return en('' + v);

            }
        }

        function flatten(a, n) {
            var r = [], i;

            if (Array.isArray(a)) {
                for (i = 0; i < a.length; i++) {
                    r.push(en(n + '[]') + '=' + val(a[i]));

                }
            } else {
                for (i in a) {
                    if (typeof a[i] === 'object') {
                        r.push(flatten(a[i], n + '[' + i + ']'));

                    } else {
                        r.push(en(n + '[' + i + ']') + '=' + val(a[i]));

                    }
                }
            }

            return r.length ? r.filter(function(v) { return v !== null }).join('&') : null;

        }

        for (n in data) {
            if (data[n] === null || data[n] === undefined) {
                continue;

            } else if (pairs) {
                q.push(en(data[n].name) + '=' + val(data[n].value));

            } else if (typeof data[n] === 'object') {
                q.push(flatten(data[n], n));

            } else {
                q.push(en(n) + '=' + val(data[n]));

            }
        }

        return q.filter(function(v) { return v !== null; }).join('&');

    };

    Url.parseQuery = function(s) {
        if (s.match(/^\??$/)) {
            return {};

        }

        s = Strings.trimLeft(s, '?').split('&');

        var p = {}, a = false, c, d, k, i, m, n, v;

        var convertType = function(v) {
            if (v.match(/^\d+$/)) {
                return parseInt(v);

            } else if (v.match(/^\d*\.\d+$/)) {
                return parseFloat(v);

            }

            return v;

        };

        for (i = 0; i < s.length; i++) {
            m = s[i].split('=');
            n = decodeURIComponent(m.shift());
            v = convertType(decodeURIComponent(m.join('=')));

            if (n.indexOf('[') !== -1) {
                n = n.replace(/\]/g, '');
                d = n.split('[');
                c = p;
                a = false;

                if (n.match(/\[$/)) {
                    d.pop();
                    a = true;

                }

                n = d.pop();

                while (d.length) {
                    k = d.shift();

                    if (c[k] === undefined) {
                        c[k] = {};

                    }

                    c = c[k];

                }

                if (a) {
                    if (c[n] === undefined) {
                        c[n] = [v];

                    } else {
                        c[n].push(v);

                    }
                } else {
                    c[n] = v;

                }
            } else {
                p[n] = v;

            }
        }

        return p;

    };

    _context.register(Url, 'Url');

});
;
_context.invoke('Utils', function (Arrays, Strings, undefined) {

    function map(args, callback) {
        args = Arrays.createFrom(args);

        if (Arrays.isArray(args[0])) {
            for (var i = 0, elems = args[0], ret = []; i < elems.length; i++) {
                args[0] = getElem(elems[i]);

                if (args[0]) {
                    ret.push(callback.apply(null, args));

                } else {
                    ret.push(args[0]);

                }
            }

            return ret;

        } else {
            args[0] = getElem(args[0]);

            if (args[0]) {
                return callback.apply(null, args);

            } else {
                return args[0];

            }
        }
    }

    function getElem(elem) {
        if (Arrays.isArray(elem) || elem instanceof HTMLCollection || elem instanceof NodeList) {
            elem = elem[0];

        }

        return typeof elem === 'string' ? DOM.getById(elem) : elem;

    }

    function getPrefixed(elem, prop) {
        elem = getElem(elem);

        if (prop in elem.style) {
            return prop;

        }


        var p = prop.charAt(0).toUpperCase() + prop.substr(1),
            variants = ['webkit' + p, 'moz' + p, 'o' + p, 'ms' + p],
            i;

        for (i = 0; i < variants.length; i++) {
            if (variants[i] in elem.style) {
                return variants[i];

            }
        }

        return prop;

    }

    function parseData(value) {
        if (!value) return null;

        try {
            return JSON.parse(value);

        } catch (e) {
            return value;

        }
    }

    var DOM = {
        getByClassName: function (className, context) {
            return Arrays.createFrom((context || document).getElementsByClassName(className));

        },

        getById: function (id) {
            return document.getElementById(id);

        },

        find: function (sel, context) {
            var elems = [];
            sel = sel.trim().split(/\s*,\s*/g);

            sel.forEach(function (s) {
                var m = s.match(/^#([^\s\[>+:\.]+)\s+\.([^\s\[>+:]+)$/);

                if (m) {
                    elems.push.apply(elems, DOM.getByClassName(m[2], DOM.getById(m[1])));
                    return;

                } else if (s.match(/^[^.#]|[\s\[>+:]/)) {
                    throw new TypeError('Invalid selector "' + s + '", only single-level .class and #id or "#id .class" are allowed');

                }

                if (s.charAt(0) === '#') {
                    m = DOM.getById(s.substr(1));

                    if (m) {
                        elems.push(m);

                    }
                } else {
                    m = DOM.getByClassName(s.substr(1), context);
                    elems.push.apply(elems, m);

                }
            });

            return elems;

        },

        getChildren: function (elem) {
            return Arrays.createFrom(elem.childNodes || '').filter(function (node) {
                return node.nodeType === 1;

            });
        },

        closest: function (elem, nodeName, className) {
            return map(arguments, function (elem, nodeName, className) {
                while (elem) {
                    if (elem.nodeType === 1 && (!nodeName || elem.nodeName.toLowerCase() === nodeName) && (!className || DOM.hasClass(elem, className))) {
                        return elem;

                    }

                    elem = elem.parentNode;

                }

                return null;
            });
        },

        create: function (elem, attrs) {
            elem = document.createElement(elem);

            if (attrs) {
                DOM.setAttributes(elem, attrs);

            }

            return elem;

        },

        createFromHtml: function (html) {
            var container = DOM.create('div');
            DOM.html(container, html);
            html = DOM.getChildren(container);

            html.forEach(function (e) {
                container.removeChild(e);
            });

            container = null;

            return html.length > 1 ? html : html[0];

        },

        setAttributes: function (elem, attrs) {
            return map([elem], function (elem) {
                for (var a in attrs) {
                    if (attrs.hasOwnProperty(a)) {
                        elem.setAttribute(a, attrs[a]);

                    }
                }

                return elem;

            });
        },

        setStyle: function (elem, prop, value, prefix) {
            if (prop && typeof prop === 'object') {
                prefix = value;
                value = prop;

                for (prop in value) {
                    if (value.hasOwnProperty(prop)) {
                        DOM.setStyle(elem, prop, value[prop], prefix);

                    }
                }

                return elem;

            }

            if (prefix !== false) {
                prop = getPrefixed(elem, prop);

            }

            return map([elem], function (elem) {
                elem.style[prop] = value;

            });
        },

        getStyle: function(elem, prop, prefix) {
            if (prefix !== false) {
                prop = getPrefixed(elem, prop);

            }

            return map([elem], function(elem) {
                return window.getComputedStyle(elem)[prop];

            });
        },

        html: function (elem, html) {
            return map([elem], function (elem) {
                elem.innerHTML = html;

                Arrays.createFrom(elem.getElementsByTagName('script')).forEach(function (elem) {
                    if (!elem.type || elem.type.toLowerCase() === 'text/javascript') {
                        var load = elem.hasAttribute('src'),
                            src = load ? elem.src : (elem.text || elem.textContent || elem.innerHTML || ''),
                            script = DOM.create('script', {type: 'text/javascript'});

                        if (load) {
                            script.src = src;

                        } else {
                            try {
                                script.appendChild(document.createTextNode(src));

                            } catch (e) {
                                script.text = src;

                            }
                        }

                        elem.parentNode.insertBefore(script, elem);
                        elem.parentNode.removeChild(elem);

                    }
                });
            });
        },

        contains: function( a, b ) {
            var adown = a.nodeType === 9 ? a.documentElement : a,
                bup = b && b.parentNode;

            return a === bup || !!( bup && bup.nodeType === 1 && (
                    adown.contains
                        ? adown.contains( bup )
                        : a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
                ));
        },

        addListener: function (elem, evt, listener) {
            return map(arguments, function (elem, evt, listener) {
                elem.addEventListener(evt, listener, false);
                return elem;

            });
        },
        removeListener: function (elem, evt, listener) {
            return map(arguments, function (elem, evt, listener) {
                elem.removeEventListener(evt, listener, false);
                return elem;

            });
        },

        getData: function (elem, key) {
            return parseData(getElem(elem).getAttribute('data-' + key));

        },
        setData: function (elem, key, value) {
            return map([elem], function (elem) {
                elem.setAttribute('data-' + key, JSON.stringify(value));
                return elem;

            });
        },

        addClass: null,
        removeClass: null,
        toggleClass: null,
        hasClass: null
    };


    var testElem = DOM.create('span'),
        prepare = function(args, asStr) {
            args = Arrays.createFrom(args, 1).join(' ').trim();
            return asStr ? args : args.split(/\s+/g);
        };

    if ('classList' in testElem) {
        testElem.classList.add('c1', 'c2');

        if (testElem.classList.contains('c2')) {
            DOM.addClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    elem.classList.add.apply(elem.classList, classes);
                    return elem;

                });
            };

            DOM.removeClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    elem.classList.remove.apply(elem.classList, classes);
                    return elem;

                });
            };
        } else {
            DOM.addClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        elem.classList.add(c);

                    });

                    return elem;

                });
            };

            DOM.removeClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        elem.classList.remove(c);

                    });

                    return elem;

                });
            };
        }

        testElem.classList.toggle('c1', true);

        if (testElem.classList.contains('c1')) {
            DOM.toggleClass = function (elem, classes, value) {
                classes = classes.trim().split(/\s+/g);

                return map([elem], function (elem) {
                    if (value === undefined) {
                        classes.forEach(function (c) {
                            elem.classList.toggle(c);

                        });
                    } else {
                        classes.forEach(function (c) {
                            elem.classList.toggle(c, !!value);

                        });
                    }

                    return elem;

                });
            };
        } else {
            DOM.toggleClass = function (elem, classes, value) {
                classes = classes.trim().split(/\s+/g);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        if (value === undefined || value === elem.classList.contains(c)) {
                            elem.classList.toggle(c);

                        }
                    });

                    return elem;

                });
            };
        }

        DOM.hasClass = function (elem, classes) {
            elem = getElem(elem);
            classes = prepare(arguments);

            for (var i = 0; i < classes.length; i++) {
                if (!elem.classList.contains(classes[i])) {
                    return false;

                }
            }

            return true;

        };
    } else {
        DOM.addClass = function (elem, classes) {
            classes = prepare(arguments, true);

            return map([elem], function (elem) {
                elem.className += (elem.className ? ' ' : '') + classes;
                return elem;

            });
        };

        DOM.removeClass = function (elem, classes) {
            classes = prepare(arguments).map(Strings.escapeRegex);

            return map([elem], function (elem) {
                if (!elem.className) return elem;

                elem.className = elem.className.replace(new RegExp('(?:^|\s+)(?:' + classes.join('|') + '(?:\s+|$)', 'g'), ' ').trim();
                return elem;

            });
        };

        DOM.toggleClass = function (elem, classes, value) {
            classes = classes.trim().split(/\s+/g);

            return map([elem], function (elem) {
                var current = (elem.className || '').trim().split(/\s+/g);

                classes.forEach(function (c) {
                    var i = current.indexOf(c),
                        has = i > -1;

                    if (value !== false && !has) {
                        current.push(c);

                    } else if (value !== true && has) {
                        current.splice(i, 1);

                    }
                });

                elem.className = current.join(' ');
                return elem;

            });
        };

        DOM.hasClass = function (elem, classes) {
            elem = getElem(elem);
            if (!elem.className) return false;
            classes = prepare(arguments);

            var current = elem.className.trim().split(/\s+/g);

            for (var i = 0; i < classes.length; i++) {
                if (current.indexOf(classes[i]) === -1) {
                    return false;

                }
            }

            return true;

        };
    }

    testElem = null;

    _context.register(DOM, 'DOM');

});
;
_context.invoke('Utils', function(undefined) {

    var ReflectionClass = function(c) {
        this._ = {
            reflectedClass: typeof c === "string" ? ReflectionClass.getClass(c) : c
        };
    };

    ReflectionClass.from = function(c) {
        return c instanceof ReflectionClass ? c : new ReflectionClass(c);

    };

    ReflectionClass.getClass = function(name) {
        return _context.lookup(name);

    };

    ReflectionClass.getClassName = function(obj, need) {
        var className = _context.lookupClass(obj);

        if (className === false && need) {
            throw new Error('Unknown class');

        }

        return className;

    };

    ReflectionClass.prototype.hasProperty = function(name) {
        return this._.reflectedClass.prototype[name] !== undefined && typeof this._.reflectedClass.prototype[name] !== "function";

    };

    ReflectionClass.prototype.hasMethod = function(name) {
        return this._.reflectedClass.prototype[name] !== undefined && typeof this._.reflectedClass.prototype[name] === "function";

    };

    ReflectionClass.prototype.newInstance = function() {
        return this.newInstanceArgs(arguments);

    };

    ReflectionClass.prototype.newInstanceArgs = function(args) {
        var inst, ret, tmp = function() {};
        tmp.prototype = this._.reflectedClass.prototype;
        inst = new tmp();
        ret = this._.reflectedClass.apply(inst, args);

        return Object(ret) === ret ? ret : inst;

    };

    _context.register(ReflectionClass, 'ReflectionClass');

});
;
_context.invoke('Utils', function(Arrays, undefined) {

    var ReflectionFunction = function(f) {
        this._ = {
            reflectedFunction: f,
            argsList: f.length ? f.toString().match(/^function\s*\(\s*(.*?)\s*\)/i)[1].split(/\s*,\s*/) : []
        };

    };

    ReflectionFunction.from = function(f) {
        return f instanceof ReflectionFunction ? f : new ReflectionFunction(f);

    };

    ReflectionFunction.prototype.invoke = function(context) {
        var args = Arrays.createFrom(arguments);
        args.shift();

        return this._.reflectedFunction.apply(context, args);

    };

    ReflectionFunction.prototype.getArgs = function () {
        return this._.argsList;

    };

    ReflectionFunction.prototype.invokeArgs = function(context, args) {
        var list = [];
        for (var i = 0; i < this._.argsList.length; i++) {
            if (args[this._.argsList[i]] === undefined) {
                throw new Error('Parameter "' + this._.argsList[i] + '" was not provided in argument list');

            }

            list.push(args[this._.argsList[i]]);

        }

        return this._.reflectedFunction.apply(context, list);

    };

    _context.register(ReflectionFunction, 'ReflectionFunction');

});
;
_context.invoke('Nittro', function () {

    var prepare = function (self, need) {
        if (!self._) {
            if (need === false) return false;
            self._ = {};

        }

        if (!self._.eventEmitter) {
            if (need === false) return false;

            self._.eventEmitter = {
                listeners: {},
                defaultListeners: {},
                namespaces: []
            };
        }
    };

    var prepareNamespaces = function (emitter, namespaces) {
        return namespaces.map(function (ns) {
            var i = emitter.namespaces.indexOf(ns);

            if (i > -1) return i;

            i = emitter.namespaces.length;
            emitter.namespaces.push(ns);

            return i;

        });
    };

    var hasCommonElement = function (a, b) {
        var i = 0, j = 0;

        while (i < a.length && j < b.length) {
            if (a[i] < b[j]) i++;
            else if (a[i] > b[j]) j++;
            else return true;

        }

        return false;

    };

    var process = function (emitter, evt, op, arg1, arg2) {
        evt = (evt || '').replace(/^\s+|\s+$/g, '').split(/\s+/g);

        evt.forEach(function (e) {
            var dflt = e.split(/:/),
                ns = dflt[0].split(/\./g);

            e = ns.shift();
            ns = prepareNamespaces(emitter, ns);
            ns.sort();
            op(emitter, e, ns, dflt[1] === 'default', arg1, arg2);

        });
    };

    var add = function (emitter, evt, ns, dflt, handler, mode) {
        if (!evt) {
            throw new TypeError('No event specified');

        }

        if (dflt) {
            if (mode !== 0 || ns.length) {
                throw new TypeError("Default event handlers don't support namespaces and one()/first()");

            } else if (emitter.defaultListeners.hasOwnProperty(evt)) {
                throw new TypeError("Event '" + evt + "' already has a default listener");

            }

            emitter.defaultListeners[evt] = handler;
            return;

        }

        if (mode === 2) {
            ns.unshift(emitter.namespaces.length);

        }

        emitter.listeners[evt] || (emitter.listeners[evt] = []);
        emitter.listeners[evt].push({handler: handler, namespaces: ns, mode: mode});

    };

    var remove = function (emitter, evt, ns, dflt, handler) {
        if (!evt) {
            var listeners = dflt ? emitter.defaultListeners : emitter.listeners;

            for (evt in listeners) {
                if (listeners.hasOwnProperty(evt)) {
                    remove(emitter, evt, ns, dflt, handler);

                }
            }

            return;

        }

        if (dflt) {
            if (emitter.defaultListeners.hasOwnProperty(evt) && (!handler || emitter.defaultListeners[evt] === handler)) {
                delete emitter.defaultListeners[evt];

            }

            return;

        }

        if (!emitter.listeners[evt]) return;

        if (ns.length) {
            emitter.listeners[evt] = emitter.listeners[evt].filter(function (listener) {
                if (handler && listener.handler !== handler) return true;
                return !listener.namespaces.length || !hasCommonElement(listener.namespaces, ns);

            });
        } else if (handler) {
            emitter.listeners[evt] = emitter.listeners[evt].filter(function (listener) {
                return listener.handler !== handler;

            });
        } else {
            if (emitter.listeners.hasOwnProperty(evt)) {
                delete emitter.listeners[evt];

            }

            if (emitter.defaultListeners.hasOwnProperty(evt)) {
                delete emitter.defaultListeners[evt];

            }
        }
    };

    var trigger = function (self, evt, data) {
        var e, _ = self._.eventEmitter;

        if (typeof evt !== "object") {
            e = new NittroEvent(evt, data);

        }

        if (_.listeners.hasOwnProperty(evt)) {
            _.listeners[evt].slice().forEach(function (listener) {
                if (listener.mode === 1) {
                    remove(_, evt, [], false, listener.handler);

                } else if (listener.mode === 2) {
                    remove(_, '', [listener.namespaces[0]], false);

                }

                listener.handler.call(self, e);

            });
        }

        if (!e.isDefaultPrevented() && _.defaultListeners.hasOwnProperty(evt)) {
            _.defaultListeners[evt].call(self, e);

        }

        return e;

    };

    var NittroEventEmitter = {
        on: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 0);
            return this;

        },

        one: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 1);
            return this;

        },

        first: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 2);
            this._.eventEmitter.namespaces.push(null);
            return this;

        },

        off: function (evt, handler) {
            if (prepare(this, false) === false) return this;
            process(this._.eventEmitter, evt, remove, handler);
            return this;

        },

        trigger: function (evt, data) {
            if (prepare(this, false) === false) return this;
            return trigger(this, evt, data);

        }
    };

    var returnTrue = function () {
        return true;
    };

    var returnFalse = function () {
        return false;
    };

    var NittroEvent = _context.extend(function (type, data) {
        this.type = type;
        this.data = data || {};

    }, {
        preventDefault: function () {
            this.isDefaultPrevented = returnTrue;

        },

        isDefaultPrevented: returnFalse

    });

    _context.register(NittroEventEmitter, 'EventEmitter');
    _context.register(NittroEvent, 'Event');

});
;
_context.invoke('Nittro', function () {

    var prepare = function (self, need) {
        if (!self._) {
            if (need === false) return false;
            self._ = {};

        }

        if (!self._.hasOwnProperty('frozen')) {
            if (need === false) return false;
            self._.frozen = false;

        }
    };

    var Freezable = {
        freeze: function () {
            prepare(this);
            this._.frozen = true;
            return this;

        },

        isFrozen: function () {
            if (prepare(this, false) === false) {
                return false;

            }

            return this._.frozen;

        },

        _updating: function (prop) {
            if (prepare(this, false) === false) {
                return this;

            }

            if (this._.frozen) {
                var className = _context.lookupClass(this) || 'object';

                if (prop) {
                    prop = ' "' + prop + '"';

                }

                throw new Error('Cannot update property' + prop + ' of a frozen ' + className);

            }

            return this;

        }
    };


    _context.register(Freezable, 'Freezable');

});
;
_context.invoke('Nittro', function () {

    var Object = _context.extend(function () {
        this._ = { };

    }, {

    });

    _context.mixin(Object, 'Nittro.EventEmitter');
    _context.register(Object, 'Object');

});
;
_context.invoke('Nittro.Ajax', function(undefined) {

    var FormData = _context.extend(function() {
        this._dataStorage = [];
        this._upload = false;

    }, {
        append: function(name, value) {
            if (value === undefined || value === null) {
                return this;

            }

            if (this._isFile(value)) {
                this._upload = true;

            } else if (typeof value === 'object' && 'valueOf' in value && /string|number|boolean/.test(typeof value.valueOf()) && !arguments[2]) {
                return this.append(name, value.valueOf(), true);

            } else if (!/string|number|boolean/.test(typeof value)) {
                throw new Error('Only scalar values and File/Blob objects can be appended to FormData, ' + (typeof value) + ' given');

            }

            this._dataStorage.push({ name: name, value: value });

            return this;

        },

        isUpload: function() {
            return this._upload;

        },

        _isFile: function(value) {
            return window.File !== undefined && value instanceof window.File || window.Blob !== undefined && value instanceof window.Blob;

        },

        mergeData: function(data) {
            for (var i = 0; i < data.length; i++) {
                this.append(data[i].name, data[i].value);

            }

            return this;

        },

        exportData: function(forcePlain) {
            if (!forcePlain && this.isUpload() && window.FormData !== undefined) {
                var fd = new window.FormData(),
                    i;

                for (i = 0; i < this._dataStorage.length; i++) {
                    fd.append(this._dataStorage[i].name, this._dataStorage[i].value);

                }

                return fd;

            } else {
                return this._dataStorage.filter(function(e) {
                    return !this._isFile(e.value);

                }, this);

            }
        }
    });

    _context.register(FormData, 'FormData');

});
;
_context.invoke('Nittro.Ajax', function (Url, FormData, undefined) {

    var Request = _context.extend('Nittro.Object', function(url, method, data) {
        this._ = {
            url: Url.from(url),
            method: (method || 'GET').toUpperCase(),
            data: data || {},
            headers: {},
            normalized: false,
            aborted: false
        };
    }, {
        getUrl: function () {
            this._normalize();
            return this._.url;

        },

        getMethod: function () {
            return this._.method;

        },

        isGet: function () {
            return this._.method === 'GET';

        },

        isPost: function () {
            return this._.method === 'POST';

        },

        isMethod: function (method) {
            return method.toUpperCase() === this._.method;

        },

        getData: function () {
            this._normalize();
            return this._.data;

        },

        getHeaders: function () {
            return this._.headers;

        },

        setUrl: function (url) {
            this._updating('url');
            this._.url = Url.from(url);
            return this;

        },

        setMethod: function (method) {
            this._updating('method');
            this._.method = method.toLowerCase();
            return this;

        },

        setData: function (k, v) {
            this._updating('data');

            if (k === null) {
                this._.data = {};

            } else if (v === undefined && typeof k === 'object') {
                for (v in k) {
                    if (k.hasOwnProperty(v)) {
                        this._.data[v] = k[v];

                    }
                }
            } else {
                this._.data[k] = v;

            }

            return this;

        },

        setHeader: function (header, value) {
            this._updating('headers');
            this._.headers[header] = value;
            return this;

        },

        setHeaders: function (headers) {
            this._updating('headers');

            for (var header in headers) {
                if (headers.hasOwnProperty(header)) {
                    this._.headers[header] = headers[header];

                }
            }

            return this;

        },

        abort: function () {
            if (!this._.aborted) {
                this._.aborted = true;
                this.trigger('abort');

            }

            return this;

        },

        isAborted: function () {
            return this._.aborted;

        },

        _normalize: function() {
            if (this._.normalized || !this.isFrozen()) {
                return;

            }

            this._.normalized = true;

            if (this._.method === 'GET' || this._.method === 'HEAD') {
                this._.url.addParams(this._.data instanceof FormData ? this._.data.exportData(true) : this._.data);
                this._.data = {};

            }
        }
    });

    _context.mixin(Request, 'Nittro.Freezable');
    _context.register(Request, 'Request');

}, {
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Ajax', function () {

    var Response = _context.extend(function(status, payload, headers) {
        this._ = {
            status: status,
            payload: payload,
            headers: headers
        };
    }, {
        getStatus: function () {
            return this._.status;

        },

        getPayload: function () {
            return this._.payload;

        },

        getHeader: function (name) {
            return this._.headers[name.toLowerCase()];

        },

        getAllHeaders: function () {
            return this._.headers;

        }
    });

    _context.register(Response, 'Response');

});
;
_context.invoke('Nittro.Ajax', function (Request) {

    var Service = _context.extend('Nittro.Object', function () {
        Service.Super.call(this);

        this._.transports = [];

    }, {
        addTransport: function (transport) {
            this._.transports.push(transport);
            return this;

        },

        'get': function (url, data) {
            return this.dispatch(this.createRequest(url, 'get', data));

        },

        post: function (url, data) {
            return this.dispatch(this.createRequest(url, 'post', data));

        },

        createRequest: function (url, method, data) {
            var request = new Request(url, method, data);
            this.trigger('request-created', {request: request});
            return request;

        },

        dispatch: function (request) {
            request.freeze();

            for (var i = 0; i < this._.transports.length; i++) {
                try {
                    return this._.transports[i].dispatch(request);

                } catch (e) { console.log(e); }
            }

            throw new Error('No transport is able to dispatch this request');

        }
    });

    _context.register(Service, 'Service');

});
;
_context.invoke('Nittro.Ajax.Transport', function (Response, FormData, Url) {

    var Native = _context.extend(function() {

    }, {
        STATIC: {
            createXhr: function () {
                if (window.XMLHttpRequest) {
                    return new XMLHttpRequest();

                } else if (window.ActiveXObject) {
                    try {
                        return new ActiveXObject('Msxml2.XMLHTTP');

                    } catch (e) {
                        return new ActiveXObject('Microsoft.XMLHTTP');

                    }
                }
            }
        },

        dispatch: function (request) {
            var xhr = Native.createXhr(),
                adv = this.checkSupport(xhr),
                self = this;

            var abort = function () {
                xhr.abort();

            };

            var cleanup = function () {
                request.off('abort', abort);

            };

            request.on('abort', abort);

            return new Promise(function (fulfill, reject) {
                if (request.isAborted()) {
                    cleanup();
                    reject(self._createError(xhr, {type: 'abort'}));

                }

                self._bindEvents(request, xhr, adv, cleanup, fulfill, reject);

                xhr.open(request.getMethod(), request.getUrl().toAbsolute(), true);

                var data = self._formatData(request, xhr);
                self._addHeaders(request, xhr);
                xhr.send(data);

            });
        },

        checkSupport: function (xhr) {
            var adv;

            if (!(adv = 'addEventListener' in xhr) && !('onreadystatechange' in xhr)) {
                throw new Error('Unsupported XHR implementation');

            }

            return adv;

        },

        _bindEvents: function (request, xhr, adv, cleanup, fulfill, reject) {
            var self = this;

            var onLoad = function (evt) {
                cleanup();

                if (xhr.status === 200) {
                    var response = self._createResponse(xhr);
                    request.trigger('success', response);
                    fulfill(response);

                } else {
                    var err = self._createError(xhr, evt);
                    request.trigger('error', err);
                    reject(err);

                }
            };

            var onError = function (evt) {
                cleanup();
                var err = self._createError(xhr, evt);
                request.trigger('error', err);
                reject(err);

            };

            var onProgress = function (evt) {
                request.trigger('progress', {
                    lengthComputable: evt.lengthComputable,
                    loaded: evt.loaded,
                    total: evt.total
                });
            };

            if (adv) {
                xhr.addEventListener('load', onLoad, false);
                xhr.addEventListener('error', onError, false);
                xhr.addEventListener('abort', onError, false);

                if ('upload' in xhr) {
                    xhr.upload.addEventListener('progress', onProgress, false);

                }
            } else {
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            onLoad();

                        } else {
                            onError();

                        }
                    }
                };

                if ('ontimeout' in xhr) {
                    xhr.ontimeout = onError;

                }

                if ('onerror' in xhr) {
                    xhr.onerror = onError;

                }

                if ('onload' in xhr) {
                    xhr.onload = onLoad;

                }
            }
        },

        _addHeaders: function (request, xhr) {
            var headers = request.getHeaders(),
                h;

            for (h in headers) {
                if (headers.hasOwnProperty(h)) {
                    xhr.setRequestHeader(h, headers[h]);

                }
            }

            if (!headers.hasOwnProperty('X-Requested-With')) {
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            }
        },

        _formatData: function (request, xhr) {
            var data = request.getData();

            if (data instanceof FormData) {
                data = data.exportData(request.isGet() || request.isMethod('HEAD'));

                if (!(data instanceof window.FormData)) {
                    data = Url.buildQuery(data, true);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

                }
            } else {
                data = Url.buildQuery(data);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            }

            return data;

        },

        _createResponse: function (xhr) {
            var payload,
                headers = {};

            (xhr.getAllResponseHeaders() || '').trim().split(/\r\n/g).forEach(function(header) {
                if (header && !header.match(/^\s+$/)) {
                    header = header.match(/^\s*([^:]+):\s*(.+)\s*$/);
                    headers[header[1].toLowerCase()] = header[2];

                }
            });

            if (headers['content-type'] && headers['content-type'].split(/;/)[0] === 'application/json') {
                payload = JSON.parse(xhr.responseText || '{}');

            } else {
                payload = xhr.responseText;

            }

            return new Response(xhr.status, payload, headers);

        },

        _createError: function (xhr, evt) {
            var response = null;

            if (xhr.readyState === 4 && xhr.status !== 0) {
                response = this._createResponse(xhr);

            }

            if (evt && evt.type === 'abort') {
                return {
                    type: 'abort',
                    status: null,
                    response: response
                };
            } else if (xhr.status === 0) {
                return {
                    type: 'connection',
                    status: null,
                    response: response
                };
            } else if (xhr.status !== 200) {
                return {
                    type: 'response',
                    status: xhr.status,
                    response: response
                };
            }

            return {
                type: 'unknown',
                status: xhr.status,
                response: response
            };
        }
    });

    _context.register(Native, 'Native');

}, {
    Url: 'Utils.Url',
    Response: 'Nittro.Ajax.Response',
    FormData: 'Nittro.Ajax.FormData'
});
;
_context.invoke('Nittro.Page', function (DOM, undefined) {

    var Snippet = _context.extend(function (id, state) {
        this._ = {
            id: id,
            container: false,
            state: typeof state === 'number' ? state : Snippet.INACTIVE,
            data: {},
            handlers: [
                [], [], [], []
            ]
        };
    }, {
        STATIC: {
            INACTIVE: -1,
            PREPARE_SETUP: 0,
            RUN_SETUP: 1,
            PREPARE_TEARDOWN: 2,
            RUN_TEARDOWN: 3
        },

        getId: function () {
            return this._.id;

        },

        setup: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.state === Snippet.PREPARE_SETUP) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_SETUP].push(prepare);

                }
            }

            if (run) {
                if (this._.state === Snippet.RUN_SETUP) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_SETUP].push(run);

                }
            }

            return this;

        },

        teardown: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.state === Snippet.PREPARE_TEARDOWN) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_TEARDOWN].push(prepare);

                }
            }

            if (run) {
                if (this._.state === Snippet.RUN_TEARDOWN) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_TEARDOWN].push(run);

                }
            }

            return this;

        },

        setState: function (state) {
            if (state === Snippet.INACTIVE) {
                this._.state = state;

                this._.handlers.forEach(function (queue) {
                    queue.splice(0, queue.length);

                });

            } else if (state - 1 === this._.state) {
                this._.state = state;

                var elm = this.getElement();

                this._.handlers[this._.state].forEach(function (handler) {
                    handler(elm);

                });

                this._.handlers[this._.state].splice(0, this._.handlers[this._.state].length);

            }

            return this;

        },

        getState: function () {
            return this._.state;

        },

        getData: function (key, def) {
            return key in this._.data ? this._.data[key] : (def === undefined ? null : def);

        },

        setData: function (key, value) {
            this._.data[key] = value;
            return this;

        },

        setContainer: function () {
            this._.container = true;
            return this;

        },

        isContainer: function () {
            return this._.container;

        },

        getElement: function () {
            return DOM.getById(this._.id);

        }
    });

    _context.register(Snippet, 'Snippet');

}, {
    DOM: 'Utils.DOM'
});
;
_context.invoke('Nittro.Page', function (Snippet, DOM) {

    var SnippetHelpers = {
        _getTransitionTargets: function (elem) {
            var sel = DOM.getData(elem, 'transition');

            if (sel === null && !DOM.getData(elem, 'dynamic-remove')) {
                sel = this._.options.defaultTransition;

            }

            return sel ? DOM.find(sel) : [];

        },

        _getRemoveTargets: function (elem) {
            var sel = DOM.getData(elem, 'dynamic-remove');
            return sel ? DOM.find(sel) : [];

        },

        _getDynamicContainerCache: function () {
            if (this._.containerCache === null) {
                this._.containerCache = DOM.getByClassName('snippet-container')
                    .map(function (elem) {
                        return elem.id;
                    });
            }

            return this._.containerCache;

        },

        _clearDynamicContainerCache: function () {
            this._.containerCache = null;

        },

        _getDynamicContainer: function (id) {
            var cache = this._getDynamicContainerCache(),
                i, n, container, data;

            for (i = 0, n = cache.length; i < n; i++) {
                container = this.getSnippet(cache[i]);

                if (!container.isContainer()) {
                    data = this._prepareDynamicContainer(container);

                } else {
                    data = container.getData('_container');

                }

                if (data.mask.test(id)) {
                    return data;

                }
            }

            throw new Error('Dynamic snippet #' + id + ' has no container');

        },

        _applySnippets: function (snippets, removeElms) {
            var setup = {},
                teardown = {},
                dynamic = [],
                containers = {};

            this._clearDynamicContainerCache();

            this._prepareStaticSnippets(snippets, setup, teardown, dynamic, removeElms);
            this._prepareDynamicSnippets(dynamic, snippets, containers);
            this._prepareRemoveTargets(removeElms, teardown);

            this._teardown(teardown);

            this._applyRemove(removeElms);
            this._applyContainers(containers, teardown);
            this._applySetup(setup, snippets);

            this._setup();

            return dynamic.map(function (snippet) {
                if (!snippet.elem) {
                    DOM.addClass(snippet.content, 'dynamic-add');
                    return snippet.content;

                } else {
                    DOM.addClass(snippet.elem, 'dynamic-update');
                    return snippet.elem;

                }
            });
        },

        _prepareDynamicContainer: function (snippet) {
            var elem = snippet.getElement(),
                data = {
                    id: snippet.getId(),
                    mask: new RegExp('^' + DOM.getData(elem, 'dynamic-mask') + '$'),
                    element: DOM.getData(elem, 'dynamic-element') || 'div',
                    sort: DOM.getData(elem, 'dynamic-sort') || 'append',
                    sortCache: DOM.getData(elem, 'dynamic-sort-cache') === false ? false : null
                };

            snippet.setContainer();
            snippet.setData('_container', data);
            return data;

        },

        _prepareRemoveTargets: function (removeElms, teardown) {
            for (var i = 0; i < removeElms.length; i++) {
                this._prepareRemoveTarget(removeElms[i], teardown);

            }
        },

        _prepareRemoveTarget: function (elem, teardown) {
            this._cleanupChildSnippets(elem, teardown);
            this._cleanupForms(elem);

            if (this.isSnippet(elem)) {
                teardown[elem.id] = true;

            }
        },

        _prepareStaticSnippets: function (snippets, setup, teardown, dynamic, removeElms) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this._prepareStaticSnippet(id, setup, teardown, dynamic, removeElms);

                }
            }
        },

        _prepareStaticSnippet: function (id, setup, teardown, dynamic, removeElms) {
            if (this._.snippets[id] && this._.snippets[id].getState() === Snippet.RUN_SETUP) {
                teardown[id] = false;

            }

            var snippet = DOM.getById(id),
                dyn;

            if (snippet) {
                dyn = DOM.hasClass(snippet.parentNode, 'snippet-container');

                if (!removeElms.length || removeElms.indexOf(snippet) === -1) {
                    this._cleanupChildSnippets(snippet, teardown);
                    this._cleanupForms(snippet);

                    if (dyn) {
                        dynamic.push({id: id, elem: snippet});

                    } else {
                        setup[id] = snippet;

                    }
                } else {
                    dynamic.push({id: id});

                }
            } else {
                dynamic.push({id: id});

            }
        },

        _prepareDynamicSnippets: function (dynamic, snippets, containers) {
            for (var i = 0; i < dynamic.length; i++) {
                this._prepareDynamicSnippet(dynamic[i], snippets[dynamic[i].id], containers);

            }
        },

        _prepareDynamicSnippet: function (snippet, content, containers) {
            var container = this._getDynamicContainer(snippet.id);

            snippet.content = this._createDynamic(container.element, snippet.id, content);

            if (!containers[container.id]) {
                containers[container.id] = [];

            }

            containers[container.id].push(snippet);

        },

        _createDynamic: function (elem, id, html) {
            elem = elem.split(/\./g);
            elem[0] = DOM.create(elem[0], { id: id });

            if (elem.length > 1) {
                DOM.addClass.apply(null, elem);

            }

            elem = elem[0];
            DOM.html(elem, html);
            return elem;

        },

        _applyRemove: function (removeElms) {
            removeElms.forEach(function (elem) {
                elem.parentNode.removeChild(elem);

            });
        },

        _applySetup: function (snippets, data) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    DOM.html(snippets[id], data[id]);

                }
            }
        },

        _applyContainers: function (containers, teardown) {
            for (var id in containers) {
                if (containers.hasOwnProperty(id)) {
                    this._applyDynamic(this.getSnippet(id), containers[id], teardown);

                }
            }
        },

        _applyDynamic: function (container, snippets, teardown) {
            var containerData = container.getData('_container');

            if (containerData.sort === 'append') {
                this._appendDynamic(container.getElement(), snippets);

            } else if (containerData.sort === 'prepend') {
                this._prependDynamic(container.getElement(), snippets);

            } else {
                this._sortDynamic(containerData, container.getElement(), snippets, teardown);

            }
        },

        _appendDynamic: function (elem, snippets) {
            snippets.forEach(function (snippet) {
                if (snippet.elem) {
                    DOM.html(snippet.elem, snippet.content.innerHTML);

                } else {
                    elem.appendChild(snippet.content);

                }
            });
        },

        _prependDynamic: function (elem, snippets) {
            var first = elem.firstChild;

            snippets.forEach(function (snippet) {
                if (snippet.elem) {
                    DOM.html(snippet.elem, snippet.content.innerHTML);

                } else {
                    elem.insertBefore(snippet.content, first);

                }
            });
        },

        _sortDynamic: function (container, elem, snippets, teardown) {
            var sortData = this._getSortData(container, elem, teardown);
            this._mergeSortData(sortData, snippets.map(function(snippet) { return snippet.content; }));

            var sorted = this._applySort(sortData);
            snippets = this._getSnippetMap(snippets);

            this._insertSorted(elem, sorted, snippets);

        },

        _insertSorted: function (container, sorted, snippets) {
            var i = 0, n = sorted.length, tmp;

            tmp = container.firstElementChild;

            while (i < n && sorted[i] in snippets && !snippets[sorted[i]].elem) {
                container.insertBefore(snippets[sorted[i]].content, tmp);
                i++;

            }

            while (n > i && sorted[n - 1] in snippets && !snippets[sorted[n - 1]].elem) {
                n--;

            }

            for (; i < n; i++) {
                if (sorted[i] in snippets) {
                    if (snippets[sorted[i]].elem) {
                        snippets[sorted[i]].elem.innerHTML = '';

                        if (snippets[sorted[i]].elem.previousElementSibling !== (i > 0 ? DOM.getById(sorted[i - 1]) : null)) {
                            container.insertBefore(snippets[sorted[i]].elem, i > 0 ? DOM.getById(sorted[i - 1]).nextElementSibling : container.firstElementChild);

                        }

                        while (tmp = snippets[sorted[i]].content.firstChild) {
                            snippets[sorted[i]].elem.appendChild(tmp);

                        }
                    } else {
                        container.insertBefore(snippets[sorted[i]].content, DOM.getById(sorted[i - 1]).nextElementSibling);

                    }
                }
            }

            while (n < sorted.length) {
                container.appendChild(snippets[sorted[n]].content);
                n++;

            }
        },

        _getSnippetMap: function (snippets) {
            var map = {};

            snippets.forEach(function (snippet) {
                map[snippet.id] = snippet;
            });

            return map;

        },

        _applySort: function (sortData) {
            var sorted = [],
                id;

            for (id in sortData.snippets) {
                sorted.push({ id: id, values: sortData.snippets[id] });

            }

            sorted.sort(this._compareDynamic.bind(this, sortData.descriptor));
            return sorted.map(function(snippet) { return snippet.id; });

        },

        _compareDynamic: function (descriptor, a, b) {
            var i, n, v;

            for (i = 0, n = descriptor.length; i < n; i++) {
                v = a.values[i] < b.values[i] ? -1 : (a.values[i] > b.values[i] ? 1 : 0);

                if (v !== 0) {
                    return v * (descriptor[i].asc ? 1 : -1);

                }
            }

            return 0;

        },

        _getSortData: function (container, elem, teardown) {
            var sortData = container.sortCache;

            if (!sortData) {
                sortData = this._buildSortData(container, elem, teardown);

                if (container.sortCache !== false) {
                    container.sortCache = sortData;

                }
            } else {
                for (var id in sortData.snippets) {
                    if (id in teardown && teardown[id]) {
                        delete sortData.snippets[id];

                    }
                }
            }

            return sortData;

        },

        _buildSortData: function (container, elem, teardown) {
            var sortData = {
                descriptor: container.sort.trim().split(/\s*,\s*/g).map(this._parseDescriptor.bind(this, container.id)),
                snippets: {}
            };

            this._mergeSortData(sortData, DOM.getChildren(elem), teardown);

            return sortData;

        },

        _mergeSortData: function (sortData, snippets, teardown) {
            snippets.forEach(function (snippet) {
                var id = snippet.id;

                if (!teardown || !(id in teardown) || !teardown[id]) {
                    sortData.snippets[id] = this._extractSortData(snippet, sortData.descriptor);

                }
            }.bind(this));
        },

        _extractSortData: function (snippet, descriptor) {
            return descriptor.map(function (field) {
                return field.extractor(snippet);

            });
        },

        _parseDescriptor: function (id, descriptor) {
            var m = descriptor.match(/^(.+?)(?:\[(.+?)\])?(?:\((.+?)\))?(?:\s+(.+?))?$/),
                sel, attr, prop, asc;

            if (!m) {
                throw new Error('Invalid sort descriptor: ' + descriptor);

            }

            sel = m[1];
            attr = m[2];
            prop = m[3];
            asc = m[4];

            if (sel.match(/^[^.]|[\s#\[>+:]/)) {
                throw new TypeError('Invalid selector for sorted insert mode in container #' + id);

            }

            sel = sel.substr(1);
            asc = asc ? /^[1tay]/i.test(asc) : true;

            if (attr) {
                return {extractor: this._getAttrExtractor(sel, attr), asc: asc};

            } else if (prop) {
                return {extractor: this._getDataExtractor(sel, prop), asc: asc};

            } else {
                return {extractor: this._getTextExtractor(sel), asc: asc};

            }
        },

        _getAttrExtractor: function (sel, attr) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? elem[0].getAttribute(attr) || null : null;
            };
        },

        _getDataExtractor: function (sel, prop) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? DOM.getData(elem[0], prop) : null;
            };
        },

        _getTextExtractor: function (sel) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? elem[0].textContent : null;
            };
        },

        _teardown: function (snippets) {
            this._setSnippetsState(snippets, Snippet.PREPARE_TEARDOWN);
            this._setSnippetsState(snippets, Snippet.RUN_TEARDOWN);
            this._setSnippetsState(snippets, Snippet.INACTIVE);

            this.trigger('teardown');

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id) && snippets[id]) {
                    delete this._.snippets[id];

                }
            }
        },

        _setup: function () {
            this.trigger('setup');

            this._setSnippetsState(this._.snippets, Snippet.PREPARE_SETUP);
            this._setSnippetsState(this._.snippets, Snippet.RUN_SETUP);

        },

        _setSnippetsState: function (snippets, state) {
            this._.currentPhase = state;

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this.getSnippet(id).setState(state);

                }
            }
        },

        _cleanupChildSnippets: function (elem, teardown) {
            for (var i in this._.snippets) {
                if (this._.snippets.hasOwnProperty(i) && this._.snippets[i].getState() === Snippet.RUN_SETUP && this._.snippets[i].getElement() !== elem && DOM.contains(elem, this._.snippets[i].getElement())) {
                    teardown[i] = true;

                }
            }
        },

        _cleanupForms: function (snippet) {
            if (!this._.formLocator) {
                return;

            }

            if (snippet.tagName.toLowerCase() === 'form') {
                this._.formLocator.removeForm(snippet);

            } else {
                var forms = snippet.getElementsByTagName('form'),
                    i;

                for (i = 0; i < forms.length; i++) {
                    this._.formLocator.removeForm(forms.item(i));

                }
            }
        }
    };

    _context.register(SnippetHelpers, 'SnippetHelpers');

}, {
    DOM: 'Utils.DOM'
});
;
_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var Transitions = _context.extend(function(duration) {
        this._ = {
            duration: duration || false,
            ready: true,
            queue: [],
            support: false
        };

        try {
            var s = DOM.create('span').style;

            this._.support = [
                'transition',
                'WebkitTransition',
                'MozTransition',
                'msTransition',
                'OTransition'
            ].some(function(prop) {
                return prop in s;
            });

            s = null;

        } catch (e) { }

    }, {
        transitionOut: function (elements) {
            return this._begin(elements, 'transition-out');

        },

        transitionIn: function (elements) {
            return this._begin(elements, 'transition-in');

        },

        _begin: function (elements, className) {
            if (!this._.support || !this._.duration || !elements.length) {
                return Promise.resolve(elements);

            } else {
                return this._resolve(elements, className);

            }
        },

        _resolve: function (elements, className) {
            if (!this._.ready) {
                return new Promise(function (fulfill) {
                    this._.queue.push([elements, className, fulfill]);

                }.bind(this));
            }

            this._.ready = false;

            if (className === 'transition-in') {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            DOM.addClass(elements, 'transition-active ' + className);
            DOM.removeClass(elements, 'transition-middle');

            var duration = this._getDuration(elements);

            var promise = new Promise(function (fulfill) {
                window.setTimeout(function () {
                    DOM.removeClass(elements, 'transition-active ' + className);

                    if (className === 'transition-out') {
                        DOM.addClass(elements, 'transition-middle');

                    }

                    this._.ready = true;

                    fulfill(elements);

                }.bind(this), duration);
            }.bind(this));

            promise.then(function () {
                if (this._.queue.length) {
                    var q = this._.queue.shift();

                    this._resolve(q[0], q[1]).then(function () {
                        q[2](q[0]);

                    });
                }
            }.bind(this));

            return promise;

        },

        _getDuration: function (elements) {
            if (!window.getComputedStyle) {
                return this._.duration;

            }

            var durations = DOM.getStyle(elements, 'animationDuration')
                .concat(DOM.getStyle(elements, 'transitionDuration'))
                .map(function(d) {
                    if (!d) {
                        return 0;
                    }

                    return Math.max.apply(null, d.split(/\s*,\s*/g).map(function(v) {
                        v = v.match(/^((?:\d*\.)?\d+)(m?s)$/);
                        return v ? parseFloat(v[1]) * (v[2] === 'ms' ? 1 : 1000) : 0;

                    }));
                });
            
            if (durations.length) {
                return Math.max.apply(null, durations);

            } else {
                return this._.duration;

            }
        }
    });

    _context.register(Transitions, 'Transitions');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
;
_context.invoke('Nittro.Page', function (DOM, Arrays, Url, SnippetHelpers, Snippet) {

    var Service = _context.extend('Nittro.Object', function (ajax, transitions, flashMessages, options) {
        Service.Super.call(this);

        this._.ajax = ajax;
        this._.transitions = transitions;
        this._.flashMessages = flashMessages;
        this._.request = null;
        this._.snippets = {};
        this._.containerCache = null;
        this._.currentPhase = Snippet.INACTIVE;
        this._.transitioning = null;
        this._.setup = false;
        this._.currentUrl = Url.fromCurrent();
        this._.options = Arrays.mergeTree({}, Service.defaults, options);

        DOM.addListener(document, 'click', this._handleClick.bind(this));
        DOM.addListener(document, 'submit', this._handleSubmit.bind(this));
        DOM.addListener(window, 'popstate', this._handleState.bind(this));
        this.on('error:default', this._showError.bind(this));

        this._checkReady();

    }, {
        STATIC: {
            defaults: {
                whitelistRedirects: false,
                whitelistLinks: true,
                whitelistForms: true,
                defaultTransition: null
            }
        },

        setFormLocator: function (formLocator) {
            this._.formLocator = formLocator;
            return this;

        },

        open: function (url, method, data) {
            return this._createRequest(url, method, data);

        },

        openLink: function (link, evt) {
            return this._createRequest(link.href, 'get', null, evt, link);

        },

        sendForm: function (form, evt) {
            this._checkFormLocator(true);

            var frm = this._.formLocator.getForm(form),
                data = frm.serialize();

            return this._createRequest(form.action, form.method, data, evt, form)
                .then(function () {
                    frm.reset();

                });
        },

        getSnippet: function (id) {
            if (!this._.snippets[id]) {
                this._.snippets[id] = new Snippet(id, this._.currentPhase);

            }

            return this._.snippets[id];

        },

        isSnippet: function (elem) {
            return (typeof elem === 'string' ? elem : elem.id) in this._.snippets;

        },

        _checkFormLocator: function (need) {
            if (this._.formLocator) {
                return true;

            } else if (!need) {
                return false;

            }

            throw new Error("Nittro/Page service: Form support wasn't enabled. Please install Nittro/Application and inject the FormLocator service using the setFormLocator() method.");

        },

        _handleState: function (evt) {
            if (evt.state === null) {
                return;
            }

            var url = Url.fromCurrent(),
                request;

            if (!this._checkUrl(url)) {
                return;

            }

            this._.currentUrl = url;
            request = this._.ajax.createRequest(url);

            try {
                this._dispatchRequest(request);

            } catch (e) {
                document.location.href = url.toAbsolute();

            }
        },

        _pushState: function (payload, url) {
            if (payload.postGet) {
                url = payload.url;

            }

            if (payload.title) {
                document.title = payload.title;

            }

            this._.currentUrl = Url.from(url);
            window.history.pushState({ _nittro: true }, document.title, this._.currentUrl.toAbsolute());

        },

        _checkReady: function () {
            if (document.readyState === 'loading') {
                DOM.addListener(document, 'readystatechange', this._checkReady.bind(this));
                return;

            }

            if (!this._.setup) {
                this._.setup = true;

                window.setTimeout(function () {
                    window.history.replaceState({ _nittro: true }, document.title, document.location.href);
                    this._setup();
                    this._showHtmlFlashes();
                    this.trigger('update');

                }.bind(this), 1);
            }
        },

        _checkLink: function (link) {
            return this._.options.whitelistLinks ? DOM.hasClass(link, 'ajax') : !DOM.hasClass(link, 'noajax');

        },

        _handleClick: function (evt) {
            if (evt.defaultPrevented || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey) {
                return;

            }

            if (this._checkFormLocator() && this._handleButton(evt)) {
                return;

            }

            var link = DOM.closest(evt.target, 'a');

            if (!link || !this._checkLink(link) || !this._checkUrl(link.href)) {
                return;

            }

            this.openLink(link, evt);

        },

        _checkForm: function (form) {
            return this._.options.whitelistForms ? DOM.hasClass(form, 'ajax') : !DOM.hasClass(form, 'noajax');

        },

        _handleButton: function(evt) {
            var btn = DOM.closest(evt.target, 'button') || DOM.closest(evt.target, 'input'),
                frm;

            if (btn && btn.type === 'submit') {
                if (btn.form && this._checkForm(btn.form)) {
                    frm = this._.formLocator.getForm(btn.form);
                    frm.setSubmittedBy(btn.name || null);

                }

                return true;

            }
        },

        _handleSubmit: function (evt) {
            if (evt.defaultPrevented || !this._checkFormLocator()) {
                return;

            }

            if (!(evt.target instanceof HTMLFormElement) || !this._checkForm(evt.target) || !this._checkUrl(evt.target.action)) {
                return;

            }

            this.sendForm(evt.target, evt);

        },

        _createRequest: function (url, method, data, evt, context) {
            if (this._.request) {
                this._.request.abort();

            }

            var create = this.trigger('create-request', {
                url: url,
                method: method,
                data: data,
                context: context
            });

            if (create.isDefaultPrevented()) {
                evt && evt.preventDefault();
                return Promise.reject();

            }

            var request = this._.ajax.createRequest(url, method, data);

            try {
                var p = this._dispatchRequest(request, context, true);
                evt && evt.preventDefault();
                return p;

            } catch (e) {
                return Promise.reject(e);

            }
        },

        _dispatchRequest: function (request, context, pushState) {
            this._.request = request;

            var xhr = this._.ajax.dispatch(request); // may throw exception

            var transitionElms,
                removeElms,
                transition;

            if (context) {
                transitionElms = this._getTransitionTargets(context);
                removeElms = this._getRemoveTargets(context);

                if (removeElms.length) {
                    DOM.addClass(removeElms, 'dynamic-remove');

                }

                this._.transitioning = transitionElms.concat(removeElms);
                transition = this._.transitions.transitionOut(this._.transitioning.slice());

            } else {
                transitionElms = [];
                removeElms = [];
                transition = null;

            }

            var p = Promise.all([xhr, transitionElms, removeElms, pushState || false, transition]);
            return p.then(this._handleResponse.bind(this), this._handleError.bind(this));

        },

        _handleResponse: function (queue) {
            if (!this._.request) {
                this._cleanup();
                return null;

            }

            var response = queue[0],
                transitionElms = queue[1] || this._.transitioning || [],
                removeElms = queue[2],
                pushState = queue[3],
                payload = response.getPayload();

            if (typeof payload !== 'object' || !payload) {
                this._cleanup();
                return null;

            }

            this._showFlashes(payload.flashes);

            if (this._tryRedirect(payload, pushState)) {
                return payload;

            } else if (pushState) {
                this._pushState(payload, this._.request.getUrl());

            }

            this._.request = this._.transitioning = null;

            var dynamic = this._applySnippets(payload.snippets || {}, removeElms);
            DOM.toggleClass(dynamic, 'transition-middle', true);

            this._showHtmlFlashes();

            this.trigger('update', payload);

            this._.transitions.transitionIn(transitionElms.concat(dynamic))
                .then(function () {
                    DOM.removeClass(dynamic, 'dynamic-add dynamic-update');

                });

            return payload;

        },

        _checkUrl: function(url) {
            var u = Url.from(url),
                c = Url.fromCurrent(),
                d = u.compare(c);

            if (d === Url.PART.HASH && !u.getHash()) {
                return true;

            }

            return d === 0 || d < Url.PART.PORT && d > Url.PART.HASH;

        },

        _checkRedirect: function (payload) {
            return !this._.options.whitelistRedirects !== !payload.allowAjax && this._checkUrl(payload.redirect);

        },

        _tryRedirect: function (payload, pushState) {
            if ('redirect' in payload) {
                if (this._checkRedirect(payload)) {
                    this._dispatchRequest(this._.ajax.createRequest(payload.redirect), null, pushState);

                } else {
                    document.location.href = payload.redirect;

                }

                return true;

            }
        },

        _cleanup: function () {
            this._.request = null;

            if (this._.transitioning) {
                this._.transitions.transitionIn(this._.transitioning);
                this._.transitioning = null;

            }
        },

        _showFlashes: function (flashes) {
            if (!flashes) {
                return;

            }

            var id, i;

            for (id in flashes) {
                if (flashes.hasOwnProperty(id) && flashes[id]) {
                    for (i = 0; i < flashes[id].length; i++) {
                        this._.flashMessages.add(null, flashes[id][i].type, flashes[id][i].message);

                    }
                }
            }
        },

        _showHtmlFlashes: function () {
            var elms = DOM.getByClassName('flashes-src'),
                i, n, data;

            for (i = 0, n = elms.length; i < n; i++) {
                data = JSON.parse(elms[i].textContent.trim());
                elms[i].parentNode.removeChild(elms[i]);
                this._showFlashes(data);

            }
        },

        _handleError: function (evt) {
            this._cleanup();
            this.trigger('error', evt);

        },

        _showError: function (evt) {
            if (evt.data.type === 'connection') {
                this._.flashMessages.add(null, 'error', 'There was an error connecting to the server. Please check your internet connection and try again.');

            } else if (evt.data.type !== 'abort') {
                this._.flashMessages.add(null, 'error', 'There was an error processing your request. Please try again later.');

            }
        }
    });

    _context.mixin(Service, SnippetHelpers);

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});
;
_context.invoke('Nittro.Widgets', function (DOM, Arrays) {

    var FlashMessages = _context.extend(function (options) {
        this._ = {
            options: Arrays.mergeTree({}, FlashMessages.defaults, options),
            globalHolder: DOM.create('div', {'class': 'flash-global-holder'})
        };

        this._.options.layer.appendChild(this._.globalHolder);

        if (!this._.options.positioning) {
            this._.options.positioning = FlashMessages.basicPositioning;

        }

    }, {
        STATIC: {
            defaults: {
                layer: null,
                minMargin: 20,
                positioning: null
            },
            basicPositioning: [
                function(target, elem, minMargin) {
                    var res = {
                        name: 'below',
                        left: target.left + (target.width - elem.width) / 2,
                        top: target.bottom
                    };

                    if (target.bottom + elem.height + minMargin < window.innerHeight && res.left > 0 && res.left + elem.width < window.innerWidth) {
                        return res;

                    }
                },
                function (target, elem, minMargin) {
                    var res = {
                        name: 'rightOf',
                        left: target.right,
                        top: target.top + (target.height - elem.height) / 2
                    };

                    if (target.right + elem.width + minMargin < window.innerWidth && res.top > 0 && res.top + elem.height < window.innerHeight) {
                        return res;

                    }
                },
                function (target, elem, minMargin) {
                    var res = {
                        name: 'above',
                        left: target.left + (target.width - elem.width) / 2,
                        top: target.top - elem.height
                    };

                    if (target.top > elem.height + minMargin && res.left > 0 && res.left + elem.width < window.innerWidth) {
                        return res;

                    }
                },
                function (target, elem, minMargin) {
                    var res = {
                        name: 'leftOf',
                        left: target.left - elem.width,
                        top: target.top + (target.height - elem.height) / 2
                    };

                    if (target.left > elem.width + minMargin && res.top > 0 && res.top + elem.height < window.innerHeight) {
                        return res;

                    }
                }
            ]
        },
        add: function (target, type, content, rich) {
            var elem = DOM.create('div', {
                'class': 'flash flash-' + (type || 'info')
            });

            if (target && typeof target === 'string') {
                target = DOM.getById(target);

            }

            if (rich) {
                DOM.html(elem, content);

            } else {
                DOM.addClass(elem, 'flash-plain');
                elem.textContent = content;

            }

            DOM.setStyle(elem, 'opacity', 0);
            this._.options.layer.appendChild(elem);

            var style = {},
                timeout = Math.max(2000, Math.round(elem.textContent.split(/\s+/).length / 0.003));

            if (target) {
                var fixed = this._hasFixedParent(target),
                    elemRect = this._getRect(elem),
                    targetRect = this._getRect(target),
                    position;

                if (fixed) {
                    style.position = 'fixed';

                }

                for (var i = 0; i < this._.options.positioning.length; i++) {
                    if (position = this._.options.positioning[i].call(null, targetRect, elemRect, this._.options.minMargin)) {
                        break;

                    }
                }

                if (position) {
                    style.left = position.left;
                    style.top = position.top;

                    if (!fixed) {
                        style.left += window.pageXOffset;
                        style.top += window.pageYOffset;

                    }

                    style.left += 'px';
                    style.top += 'px';
                    style.opacity = '';

                    DOM.setStyle(elem, style);
                    this._show(elem, position.name, timeout);
                    return;

                }
            }

            this._.globalHolder.appendChild(elem);
            DOM.setStyle(elem, 'opacity', '');
            this._show(elem, 'global', timeout);

        },

        _show: function (elem, position, timeout) {
            DOM.addClass(elem, 'flash-show flash-' + position);

            window.setTimeout(function () {
                var foo = window.pageYOffset; // need to force css recalculation
                DOM.removeClass(elem, 'flash-show');
                this._bindHide(elem, timeout);

            }.bind(this), 1);
        },

        _bindHide: function (elem, timeout) {
            var hide = function () {
                DOM.removeListener(document, 'mousemove', hide);
                DOM.removeListener(document, 'mousedown', hide);
                DOM.removeListener(document, 'keydown', hide);
                DOM.removeListener(document, 'touchstart', hide);

                window.setTimeout(function () {
                    DOM.addClass(elem, 'flash-hide');

                    window.setTimeout(function () {
                        elem.parentNode.removeChild(elem);

                    }, 1000);
                }, timeout);
            }.bind(this);

            DOM.addListener(document, 'mousemove', hide);
            DOM.addListener(document, 'mousedown', hide);
            DOM.addListener(document, 'keydown', hide);
            DOM.addListener(document, 'touchstart', hide);

        },

        _hasFixedParent: function (elem) {
            do {
                if (elem.style.position === 'fixed') return true;
                elem = elem.offsetParent;

            } while (elem && elem !== document.documentElement && elem !== document.body);

            return false;

        },

        _getRect: function (elem) {
            var rect = elem.getBoundingClientRect();

            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: 'width' in rect ? rect.width : (rect.right - rect.left),
                height: 'height' in rect ? rect.height : (rect.bottom - rect.top)
            };
        }
    });

    _context.register(FlashMessages, 'FlashMessages');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});
;
_context.invoke(function (Page, Ajax, FlashMessages) {

    var ajax = new Ajax.Service();
    ajax.addTransport(new Ajax.Transport.Native());

    var transitions = new Page.Transitions(300);
    var flashMessages = new FlashMessages({ layer: document.body });

    var page = new Page.Service(ajax, transitions, flashMessages, {
        whitelistLinks: false,
        defaultTransition: '.transition-auto'
    });

    _context.register(page, 'page');

}, {
    Page: 'Nittro.Page',
    Ajax: 'Nittro.Ajax',
    FlashMessages: 'Nittro.Widgets.FlashMessages'
});
