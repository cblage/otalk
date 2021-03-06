/*global $, app, me, client*/
"use strict";

var BasePage = require('./base');
var templates = require('../templates');
var Message = require('../views/mucMessage');
var MessageModel = require('../models/message');


module.exports = BasePage.extend({
    template: templates.pages.groupchat,
    initialize: function (spec) {
        this.editMode = false;
        this.render();
    },
    events: {
        'keydown textarea': 'handleKeyDown',
        'keyup textarea': 'handleKeyUp',
        'click .joinRoom': 'handleJoin',
        'click .leaveRoom': 'handleLeave'
    },
    srcBindings: {
        avatar: 'header .avatar'
    },
    textBindings: {
        displayName: 'header .name'
    },
    show: function (animation) {
        BasePage.prototype.show.apply(this, [animation]);
        client.sendMessage({
            type: 'groupchat',
            to: this.model.jid,
            chatState: 'active'
        });
    },
    hide: function () {
        BasePage.prototype.hide.apply(this);
        client.sendMessage({
            type: 'groupchat',
            to: this.model.jid,
            chatState: 'inactive'
        });
    },
    render: function () {
        this.renderAndBind();
        this.typingTimer = null;
        this.$chatInput = this.$('.chatBox textarea');
        this.$messageList = this.$('.messages');
        this.renderCollection(this.model.messages, Message, this.$('.messages'));
        this.registerBindings();
        return this;
    },
    handleKeyDown: function (e) {
        clearTimeout(this.typingTimer);
        if (e.which === 13 && !e.shiftKey) {
            this.sendChat();
            e.preventDefault();
            return false;
        } else if (e.which === 38 && this.$chatInput.val() === '' && this.model.lastSentMessage) {
            this.editMode = true;
            this.$chatInput.addClass('editing');
            this.$chatInput.val(this.model.lastSentMessage.body);
            e.preventDefault();
            return false;
        } else if (e.which === 40 && this.editMode) {
            this.editMode = false;
            this.$chatInput.removeClass('editing');
            e.preventDefault();
            return false;
        } else if (!e.ctrlKey && !e.metaKey) {
            if (!this.typing) {
                this.typing = true;
                client.sendMessage({
                    type: 'groupchat',
                    to: this.model.jid,
                    chatState: 'composing'
                });
            }
        }
    },
    handleKeyUp: function (e) {
        this.resizeInput();
        this.typingTimer = setTimeout(this.pausedTyping.bind(this), 3000);
        if (this.typing && this.$chatInput.val().length === 0) {
            this.typing = false;
            client.sendMessage({
                type: 'groupchat',
                to: this.model.jid,
                chatState: 'active'
            });
        }
    },
    resizeInput: function () {
        var height;
        var scrollHeight;
        var newHeight;
        var newPadding;
        var paddingDelta;
        var maxHeight = 102;

        this.$chatInput.removeAttr('style');
        height = this.$chatInput.height() + 10,
        scrollHeight = this.$chatInput.get(0).scrollHeight,
        newHeight = scrollHeight + 2;

        if (newHeight > maxHeight) newHeight = maxHeight;
        if (newHeight > height) {
            this.$chatInput.css('height', newHeight);
            newPadding = newHeight + 21;
            paddingDelta = newPadding - parseInt(this.$messageList.css('paddingBottom'), 10);
            if (!!paddingDelta) {
                this.$messageList.css('paddingBottom', newPadding);
            }
        }
    },
    pausedTyping: function () {
        if (this.typing) {
            this.typing = false;
            client.sendMessage({
                type: 'groupchat',
                to: this.model.jid,
                chatState: 'paused'
            });
        }
    },
    sendChat: function () {
        var message;
        var val = this.$chatInput.val();

        if (val) {
            message = {
                to: this.model.jid,
                type: 'groupchat',
                body: val,
                chatState: 'active'
            };
            if (this.editMode) {
                message.replace = this.model.lastSentMessage.id || this.model.lastSentMessage.cid;
            }

            var id = client.sendMessage(message);
            message.id = id;
            message.from = me.jid;

            if (this.editMode) {
                this.model.lastSentMessage.correct(message);
            } else {
                var msgModel = new MessageModel(message);
                msgModel.cid = id;
                this.model.messages.add(msgModel);
                this.model.lastSentMessage = msgModel;
            }
        }
        this.editMode = false;
        this.typing = false;
        this.$chatInput.removeClass('editing');
        this.$chatInput.val('');
    },
    handleJoin: function () {
        this.model.join();
    },
    handleLeave: function () {
        this.model.leave();
    }
});
