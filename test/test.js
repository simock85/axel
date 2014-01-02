suite('Axel', function(){
    var assert = chai.assert;

    setup(function(){
        //empty right now
    });

    suite('.resolve()', function(){
        setup(function(){

        });

        teardown(function() {
            axel.clear();
        });

        test('should resolve correctly nested aliases', function(){
            axel.register('original', 'file.js');
            axel.alias('original', 'jQuery');
            axel.alias('jQuery', 'jQ');
            axel.alias('$', 'jQuery');
            axel.alias('jQr', 'jQ');

            chai.assert.equal(axel.resolve('$'), 'original');
        });

        test('aliases to non registered modules should return null', function(){
            axel.alias('pippo', 'pluto');

            chai.assert.equal(axel.resolve('pluto'), null);
            chai.assert.equal(axel.resolve('pippo'), null);
        });

        test('should avoid recursive aliases', function() {
            axel.alias('1', '2');
            axel.alias('2', '3');
            axel.alias('3', '1');

            chai.assert.equal(axel.resolve('1'), null);
            chai.assert.equal(axel.resolve('2'), null);
            chai.assert.equal(axel.resolve('3'), null);
        });

        test('aliases should work independently from registration time', function() {
            axel.alias('1', '2');
            axel.alias('2', '3');
            axel.alias('3', '1');
            axel.register('1', 'file.js');

            chai.assert.equal(axel.resolve('1'), '1');
            chai.assert.equal(axel.resolve('2'), '1');
            chai.assert.equal(axel.resolve('3'), '1');
        });

        test('avoid self aliasing', function() {
            axel.alias('1', '1');

            chai.assert.equal(axel.resolve('1'), null);
        });

        test('avoid self aliasing with registration', function() {
            axel.register('1', 'file.js');
            axel.alias('1', '1');

            chai.assert.equal(axel.resolve('1'), '1');
        });


        test('avoid multiple aliasing with no registration', function() {
            axel.alias('1', '1');
            axel.alias('1', '2');
            axel.alias('1', '3');

            chai.assert.equal(axel.resolve('1'), null);
        });

        test('avoid multiple aliasing with registration', function() {
            axel.register('1', 'file.js');
            axel.alias('1', '2');
            axel.alias('1', '3');

            chai.assert.equal(axel.resolve('1'), '1');
            chai.assert.equal(axel.resolve('2'), '1');
            chai.assert.equal(axel.resolve('3'), '1');
        });
    });

    suite('.register()', function() {
        var loaded_file = null;
        var head_js_load = null;

        setup(function(){
            head_js_load = window['head'].load;
            window['head'].load = function(name) {
                loaded_file = name;
            };
        });

        teardown(function() {
            axel.clear();
            loaded_file = null;
            window['head'].load = head_js_load;
        });

        test('register multiple times should lead to first path', function() {
            axel.register('original', 'file.js');
            axel.register('original', 'file2.js');

            axel.load('original');
            assert.deepEqual(loaded_file, {'file.js': 'file.js'});
        });

        test('register with alias should lead to first path', function() {
            axel.register('original', 'file.js');
            axel.alias('jquery', 'original');
            axel.register('jquery', 'file2.js');

            axel.load('jquery');
            assert.deepEqual(loaded_file, {'file.js': 'file.js'});
        });

        test('register with alias first should lead to first path', function() {
            axel.alias('jquery', 'original');
            axel.register('original', 'file.js');
            axel.register('jquery', 'file2.js');
            axel.register('jquery', 'file3.js');

            axel.load('jquery');
            assert.deepEqual(loaded_file, {'file.js': 'file.js'});
        });

        test('should detect unknown precedence over aliases', function() {
            axel.register('original', 'file.js');
            axel.register('jquery', 'file2.js');

            var make_alias = function() {
                axel.alias('original', 'jquery');
            };
            assert.throws(make_alias, 'AlreadyRegistered');
        });

        test('register with not paths should not permit load', function() {
            axel.register('1');

            var load_module = function() {
                axel.load('1');
            };
            assert.throws(load_module, 'NotRegistered');
        });

        test('lazy path declaration should work', function() {
            axel.register('1');
            axel.register('1', 'file.js');

            axel.load('1');
            assert.deepEqual(loaded_file, {'file.js': 'file.js'});
        });

        test('lazy register, should mark first module', function() {
            axel.register('1');
            axel.alias('1', '2');
            axel.alias('2', '3');
            axel.register('1', 'file.js');

            axel.load('3');
            assert.deepEqual(loaded_file, {'file.js': 'file.js'});
        });
    });

    suite('.load()', function() {
        var loaded_file = [];
        var head_js_load = null;

        setup(function(){
            head_js_load = window['head'].load;
            window['head'].load = function() {
                for (var i=0; i<arguments.length; ++i) {
                    var loaded_script = arguments[i];
                    if(loaded_script)
                        loaded_file.push(loaded_script);
                }
            };
        });

        teardown(function() {
            axel.clear();
            loaded_file = [];
            window['head'].load = head_js_load;
        });

        test('should correctly load by name', function() {
            axel.register('original', 'file.js');
            axel.alias('original', 'jQuery');
            axel.alias('jQuery', 'jQ');
            axel.alias('$', 'jQuery');
            axel.alias('jQr', 'jQ');

            axel.load('jQuery');
            chai.assert.deepEqual(loaded_file, [{'file.js': 'file.js'}]);
        });

        test('should correctly load multiple files', function() {
            axel.register('original', 'file.js');
            axel.register('another', 'file2.js');
            axel.alias('jQuery', 'original');
            axel.register('jQuery', 'jquery.js');

            axel.load(['jQuery', 'another']);
            chai.assert.deepEqual(loaded_file, [{'file.js': 'file.js'}, {'file2.js': 'file2.js'}]);
        });

        test('should collapse load of same file', function() {
            axel.register('original', 'file.js');
            axel.register('another', 'file2.js');
            axel.alias('jQuery', 'original');
            axel.register('jQuery', 'jquery.js');

            axel.load(['jQuery', 'original']);
            chai.assert.deepEqual(loaded_file, [{'file.js': 'file.js'}]);
        });
    });

    suite('.ready()', function(){
        var ready_calls = {};
        var head_js_ready = null;

        setup(function(){
            head_js_ready = window['head'].ready;
            window['head'].ready = function(path, callback){
                ready_calls[path] = callback;
            }
        });

        teardown(function(){
            axel.clear();
            ready_calls = {};
            window['head'].ready = head_js_ready;
        });

        test('should register callback', function(){
            var noop = function(){};
            axel.register('egg', 'file.js');
            axel.ready('egg', noop);
            axel.load('egg');
            chai.assert.deepEqual(ready_calls, {'file.js': noop});
        });

        test('should register callback also if alias is loaded', function(){
            var noop = function(){};
            axel.register('egg', 'file.js');
            axel.alias('ham', 'egg');
            axel.ready('ham', noop);
            axel.load('ham');
            chai.assert.deepEqual(ready_calls, {'file.js': noop});
        });

        test('should collapse callbacks', function(){
            var noop = function(){};
            axel.register('egg', 'file.js');
            axel.alias('ham', 'egg');
            axel.ready('ham', noop);
            axel.load(['ham', 'egg']);
            chai.assert.deepEqual(ready_calls, {'file.js': noop});
        });

        test('should register callback from promise', function(){
            var noop = function(){};
            axel.ready('egg', noop);
            axel.register('egg', 'file.js');
            axel.load('egg');
            chai.assert.deepEqual(ready_calls, {'file.js': noop});
        });

        test('should register callback from promise also if alias is loaded', function(){
            var noop = function(){};
            axel.ready('ham', noop);
            axel.register('egg', 'file.js');
            axel.alias('ham', 'egg');
            axel.load('ham');
            chai.assert.deepEqual(ready_calls, {'file.js': noop});
        });

        test('should collapse promises', function(){
            var noop = function(){};
            axel.ready('ham', noop);
            axel.register('egg', 'file.js');
            axel.alias('ham', 'egg');
            axel.load(['ham', 'egg']);
            chai.assert.deepEqual(ready_calls, {'file.js': noop});
        });
    })
});
