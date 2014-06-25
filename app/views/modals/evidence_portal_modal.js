Balanced.EvidencePortalModalView = Balanced.ModalBaseView.extend({
	templateName: 'modals/evidence_portal_modal',
	title: 'Attach docs',
	elementId: 'evidence-portal',
	classNameBindings: [":wide-modal", ":modal-overflow"],
	maxDocumentCount: 50,

	documents: Ember.computed.readOnly('model.documents'),
	documentsToUpload: function() {
		return [];
	}.property(), // Ember.computed.readOnly('model.documents_to_upload'),

	modalMessage: 'Please provide shipping receipts with shipping address, tracking numbers and any evidence of received goods or services purchased. This dispute will most likely result in a lost if you do not respond by',

	validDocumentCount: function() {
		var documentsToUpload = this.get('documentsToUpload');
		if (!documentsToUpload) {
			return 0;
		}
		return documentsToUpload.filter(function(doc, index, arr) {
			return !(doc.get('isUploading') || doc.get('isError'));
		}).length || 0;
	}.property('model', 'documentsToUpload', 'documentsToUpload.@each'),

	noValidDocument: Ember.computed.equal('validDocumentCount', 0),
	isDisabled: Balanced.computed.orProperties('noValidDocument', 'model.isSaving'),

	upload: function() {
		if (!this.get('model.dispute_documents_uri')) {
			return;
		}

		var marketplaceId = Balanced.currentMarketplace.get('id');
		var userMarketplace = Balanced.Auth.get('user').user_marketplace_for_id(marketplaceId);
		var secret = userMarketplace.get('secret');
		var auth = Balanced.Utils.encodeAuthorization(secret);
		var params = [];
		for (var index = 0; index < 50; ++index) {
			params.push('documents[' + index + ']');
		}

		this.$('#fileupload').fileupload({
			// TODO: read the URL from config or what
			url: 'http://localhost:3000' + this.get('model.dispute_documents_uri'),
			autoUpload: false,
			headers: {
				'Authorization': auth
			},
			paramName: params,
			done: _.bind(this.fileUploadDone, this),
			fail: _.bind(this.fileUploadFail, this),
			always: _.bind(this.fileUploadAlways, this),
			submit: _.bind(this.fileUploadSubmit, this)
		}).on('fileuploadadd', _.bind(this.fileUploadAdd, this));
	}.observes('model'),

	fileUploadFail: function(e, data) {
		var documentsToUpload = this.get('documentsToUpload');
		var doc = documentsToUpload.findBy('uuid', data.files[0].uuid);
		doc.set('isError', true);

		this.get('model').setProperties({
			displayErrorDescription: true,
			errorDescription: data._response.jqXHR.responseJSON.message.htmlSafe()
		});
	},

	fileUploadSubmit: function(e, data) {
		console.log('submit', e, data);
	},

	fileUploadAdd: function(e, data) {
		var documentsToUpload = this.get('documentsToUpload');
		var errorCount = 0;

		_.each(data.files, function(file) {
			// Dont add documents we've already seen
			if (file.uuid) {
				return;
			}
			// To remember the documents
			data.files[0].uuid = _.uniqueId('DD');

			var documentHasErrors = Balanced.DisputeDocument.hasErrors(file);

			if (documentHasErrors) {
				errorCount++;
			} else {
				var doc = Balanced.DisputeDocument.create({
					file_name: file.name,
					file_size: file.size,
					uuid: file.uuid,
					file: file
				});
				documentsToUpload.pushObject(doc);
			}
		}, this);

		if (errorCount > 0) {
			var invalidFileMessage = (errorCount === 1) ? '%@ file is invalid. ' : '%@ files are invalid. ';
			invalidFileMessage = invalidFileMessage.fmt(errorCount) + 'Please only attach .pdf, .doc, or .jpeg files less than 10 mb.';

			this.get('model').setProperties({
				displayErrorDescription: true,
				errorDescription: invalidFileMessage
			});
		}

		this.reposition();
	},

	fileUploadDone: function(e, data) {
		this.hide();
		this.get('model').reload();
	},

	fileUploadAlways: function(e, data) {
		var documents = this.get('documents');
		var doc = documents.findBy('uuid', data.files[0].uuid);
		if (!doc) {
			return;
		}

		doc.set('isUploading', false);
	},

	actions: {
		fileSelectionChanged: function() {
			this.fileUploadAdd(event, event.target);
		},

		remove: function(doc) {
			if (!doc) {
				return;
			}

			this.get('documentsToUpload').removeObject(doc);
		},

		reload: function() {
			this.get('documentsToUpload').reload();
		},

		save: function() {
			var documentsToUpload = this.get('documentsToUpload');
			var fileList = documentsToUpload.mapBy('file');

			this.$('#fileupload').fileupload('send', {
				files: fileList
			}).done(function() {
				documentsToUpload.reload();
			});
		}
	}
});

Balanced.EvidencePortalModalView.reopenClass({
	open: function(dispute) {
		return this.create({
			model: dispute
		});
	},
});
