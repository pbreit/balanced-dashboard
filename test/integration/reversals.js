module('Reversals', {
	setup: function() {
		Testing.setupMarketplace();
		Testing.createReversal();
	},
	teardown: function() {
		Testing.restoreMethods(
			Balanced.Adapter.update
		);
	}
});

test('can visit page', function(assert) {
	visit(Testing.REVERSAL_ROUTE)
		.checkPageTitle("Reversal $100.00", assert);
});

test('can edit reversal', function(assert) {
	var spy = sinon.spy(Balanced.Adapter, "update");

	visit(Testing.REVERSAL_ROUTE)
		.click('.key-value-display .edit-model-link')
		.fillIn('#edit-transaction .modal-body input[name=description]', "changing desc")
		.click('#edit-transaction .modal-footer button[name=modal-submit]')
		.then(function() {
			assert.ok(spy.calledOnce);
			assert.ok(spy.calledWith(Balanced.Reversal));
			assert.equal(spy.getCall(0).args[2].description, "changing desc");
		});
});

test('renders metadata correctly', function(assert) {
	var spy = sinon.spy(Balanced.Adapter, "update");

	var metaData = {
		'key': 'value',
		'other-keey': 'other-vaalue'
	};

	visit(Testing.REVERSAL_ROUTE)
		.then(function() {
			var model = Balanced.__container__.lookup('controller:reversals').get("model");
			Ember.run(function() {
				model.set('meta', metaData);
			});
		})
		.checkElements({
			".dl-horizontal dt:contains(key)": 1,
			".dl-horizontal dd:contains(value)": 1,

			".dl-horizontal dt:contains(other-keey)": 1,
			".dl-horizontal dd:contains(other-vaalue)": 1,
		}, assert);
});
