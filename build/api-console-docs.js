(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());window.Polymer = {
Settings: function () {
var settings = window.Polymer || {};
if (!settings.noUrlSettings) {
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (settings[o[0]] = o[1] || true);
}
}
settings.wantShadow = settings.dom === 'shadow';
settings.hasShadow = Boolean(Element.prototype.createShadowRoot);
settings.nativeShadow = settings.hasShadow && !window.ShadowDOMPolyfill;
settings.useShadow = settings.wantShadow && settings.hasShadow;
settings.hasNativeImports = Boolean('import' in document.createElement('link'));
settings.useNativeImports = settings.hasNativeImports;
settings.useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
settings.useNativeShadow = settings.useShadow && settings.nativeShadow;
settings.usePolyfillProto = !settings.useNativeCustomElements && !Object.__proto__;
settings.hasNativeCSSProperties = !navigator.userAgent.match('AppleWebKit/601') && window.CSS && CSS.supports && CSS.supports('box-shadow', '0 0 0 var(--foo)');
settings.useNativeCSSProperties = settings.hasNativeCSSProperties && settings.lazyRegister && settings.useNativeCSSProperties;
settings.isIE = navigator.userAgent.match('Trident');
return settings;
}()
};(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
prototype = desugar(prototype);
var customCtor = prototype === prototype.constructor.prototype ? prototype.constructor : null;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
var ctor = document.registerElement(prototype.is, options);
return customCtor || ctor;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = function (prototype) {
if (!prototype.factoryImpl) {
prototype.factoryImpl = function () {
};
}
return desugar(prototype).constructor;
};
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript || {}).ownerDocument;
}
});Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
hasRendered: function () {
return this._ready;
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;(function () {
'use strict';
var settings = Polymer.Settings;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.mixin(this, feature);
},
registerCallback: function () {
if (settings.lazyRegister === 'max') {
if (this.beforeRegister) {
this.beforeRegister();
}
} else {
this._desugarBehaviors();
for (var i = 0, b; i < this.behaviors.length; i++) {
b = this.behaviors[i];
if (b.beforeRegister) {
b.beforeRegister.call(this);
}
}
if (this.beforeRegister) {
this.beforeRegister();
}
}
this._registerFeatures();
if (!settings.lazyRegister) {
this.ensureRegisterFinished();
}
},
createdCallback: function () {
if (settings.disableUpgradeEnabled) {
if (this.hasAttribute('disable-upgrade')) {
this._propertySetter = disableUpgradePropertySetter;
this._configValue = null;
this.__data__ = {};
return;
} else {
this.__hasInitialized = true;
}
}
this.__initialize();
},
__initialize: function () {
if (!this.__hasRegisterFinished) {
this._ensureRegisterFinished(this.__proto__);
}
Polymer.telemetry.instanceCount++;
this.root = this;
for (var i = 0, b; i < this.behaviors.length; i++) {
b = this.behaviors[i];
if (b.created) {
b.created.call(this);
}
}
if (this.created) {
this.created();
}
this._initFeatures();
},
ensureRegisterFinished: function () {
this._ensureRegisterFinished(this);
},
_ensureRegisterFinished: function (proto) {
if (proto.__hasRegisterFinished !== proto.is || !proto.is) {
if (settings.lazyRegister === 'max') {
proto._desugarBehaviors();
for (var i = 0, b; i < proto.behaviors.length; i++) {
b = proto.behaviors[i];
if (b.beforeRegister) {
b.beforeRegister.call(proto);
}
}
}
proto.__hasRegisterFinished = proto.is;
if (proto._finishRegisterFeatures) {
proto._finishRegisterFeatures();
}
for (var j = 0, pb; j < proto.behaviors.length; j++) {
pb = proto.behaviors[j];
if (pb.registered) {
pb.registered.call(proto);
}
}
if (proto.registered) {
proto.registered();
}
if (settings.usePolyfillProto && proto !== this) {
proto.extend(this, proto);
}
}
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
for (var i = 0, b; i < self.behaviors.length; i++) {
b = self.behaviors[i];
if (b.attached) {
b.attached.call(self);
}
}
if (self.attached) {
self.attached();
}
});
},
detachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = false;
for (var i = 0, b; i < self.behaviors.length; i++) {
b = self.behaviors[i];
if (b.detached) {
b.detached.call(self);
}
}
if (self.detached) {
self.detached();
}
});
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
for (var i = 0, b; i < this.behaviors.length; i++) {
b = this.behaviors[i];
if (b.attributeChanged) {
b.attributeChanged.call(this, name, oldValue, newValue);
}
}
if (this.attributeChanged) {
this.attributeChanged(name, oldValue, newValue);
}
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (target, source) {
if (target && source) {
var n$ = Object.getOwnPropertyNames(source);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, source, target);
}
}
return target || source;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_logger: function (level, args) {
if (args.length === 1 && Array.isArray(args[0])) {
args = args[0];
}
switch (level) {
case 'log':
case 'warn':
case 'error':
console[level].apply(console, args);
break;
}
},
_log: function () {
var args = Array.prototype.slice.call(arguments, 0);
this._logger('log', args);
},
_warn: function () {
var args = Array.prototype.slice.call(arguments, 0);
this._logger('warn', args);
},
_error: function () {
var args = Array.prototype.slice.call(arguments, 0);
this._logger('error', args);
},
_logf: function () {
return this._logPrefix.concat(this.is).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome && !/edge/i.test(navigator.userAgent) || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
Polymer.BaseDescriptors = {};
var disableUpgradePropertySetter;
if (settings.disableUpgradeEnabled) {
disableUpgradePropertySetter = function (property, value) {
this.__data__[property] = value;
};
var origAttributeChangedCallback = Polymer.Base.attributeChangedCallback;
Polymer.Base.attributeChangedCallback = function (name, oldValue, newValue) {
if (!this.__hasInitialized && name === 'disable-upgrade') {
this.__hasInitialized = true;
this._propertySetter = Polymer.Bind._modelApi._propertySetter;
this._configValue = Polymer.Base._configValue;
this.__initialize();
}
origAttributeChangedCallback.call(this, name, oldValue, newValue);
};
}
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
}());(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.mixin(DomModule.prototype, {
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
Object.defineProperty(DomModule.prototype, 'constructor', {
value: DomModule,
configurable: true,
writable: true
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
var useAssignment = b._noAccessors;
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
if (useAssignment) {
this[n] = b[n];
} else {
this.copyOwnProperty(n, b, this);
}
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true,
_noAccessors: true
};Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
p = Object.create(this.getNativePrototype(tag));
var p$ = Object.getOwnPropertyNames(Polymer.Base);
for (var i = 0, n; i < p$.length && (n = p$[i]); i++) {
if (!Polymer.BaseDescriptors[n]) {
p[n] = Polymer.Base[n];
}
}
Object.defineProperties(p, Polymer.BaseDescriptors);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
(function () {
var propertiesDesc = {
configurable: true,
writable: true,
enumerable: true,
value: {}
};
Polymer.BaseDescriptors.properties = propertiesDesc;
Object.defineProperty(Polymer.Base, 'properties', propertiesDesc);
}());Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});Polymer.version = "1.8.1";Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
for (var i = 0, b; i < this.behaviors.length; i++) {
b = this.behaviors[i];
if (b.ready) {
b.ready.call(this);
}
}
if (this.ready) {
this.ready();
}
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node || null;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.mixin(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.mixin(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());Polymer.Base.mixin(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
var path = this.event.path;
if (!Array.isArray(path)) {
path = Array.prototype.slice.call(path);
}
return path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.mixin(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.mixin(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.mixin(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
var domHostDesc = {
get: function () {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
configurable: true
};
Object.defineProperty(Polymer.Base, 'domHost', domHostDesc);
Polymer.BaseDescriptors.domHost = domHostDesc;
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
this.callback = null;
}
},
complete: function () {
if (this.finish) {
var callback = this.callback;
this.stop();
callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
(function () {
Polymer.nar = [];
var disableUpgradeEnabled = Polymer.Settings.disableUpgradeEnabled;
Polymer.Annotations = {
parseAnnotations: function (template, stripWhiteSpace) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, stripWhiteSpace || template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote, stripWhiteSpace);
}
if (node.localName == 'slot') {
node = this._replaceSlotWithContent(node);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_replaceSlotWithContent: function (slot) {
var content = slot.ownerDocument.createElement('content');
while (slot.firstChild) {
content.appendChild(slot.firstChild);
}
var attrs = slot.attributes;
for (var i = 0; i < attrs.length; i++) {
var attr = attrs[i];
content.setAttribute(attr.name, attr.value);
}
var name = slot.getAttribute('name');
if (name) {
content.setAttribute('select', '[slot=\'' + name + '\']');
}
slot.parentNode.replaceChild(content, slot);
return content;
},
_parseTemplate: function (node, index, list, parent, stripWhiteSpace) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node, stripWhiteSpace);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
if (disableUpgradeEnabled && origName === 'disable-upgrade$') {
node.setAttribute(name, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
}());(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && ABS_URL.test(url)) {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.body.__urlResolver || (ownerDocument.body.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var ABS_URL = /(^\/)|(^#)|(^[\w-\d]*:)/;
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());Polymer.Path = {
root: function (path) {
var dotIndex = path.indexOf('.');
if (dotIndex === -1) {
return path;
}
return path.slice(0, dotIndex);
},
isDeep: function (path) {
return path.indexOf('.') !== -1;
},
isAncestor: function (base, path) {
return base.indexOf(path + '.') === 0;
},
isDescendant: function (base, path) {
return path.indexOf(base + '.') === 0;
},
translate: function (base, newBase, path) {
return newBase + path.slice(base.length);
},
matches: function (base, wildcard, path) {
return base === path || this.isAncestor(base, path) || Boolean(wildcard) && this.isDescendant(base, path);
}
};Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = Polymer.Path.root(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
var name = '_parent_' + prop;
bindings.push({
index: note.index,
kind: 'property',
name: name,
propertyName: name,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
if (p.signature.dynamicFn) {
pp[p.signature.method] = true;
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
if (!Polymer.Settings.isIE || target != window) {
hbl.set(target, bl);
}
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var SUPPORTS_PASSIVE = false;
(function () {
try {
var opts = Object.defineProperty({}, 'passive', {
get: function () {
SUPPORTS_PASSIVE = true;
}
});
window.addEventListener('test', null, opts);
window.removeEventListener('test', null, opts);
} catch (e) {
}
}());
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
var sc = mouseEvent.sourceCapabilities;
if (sc && !sc.firesTouchEvents) {
return;
}
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
var events = IS_TOUCH_ONLY ? ['click'] : MOUSE_EVENTS;
for (var i = 0, en; i < events.length; i++) {
en = events[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse(ev) {
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
document.addEventListener('touchend', ignoreMouse, SUPPORTS_PASSIVE ? { passive: true } : false);
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1 && dep !== 'click') {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var preventer = detail.preventer || detail.sourceEvent;
if (preventer && preventer.preventDefault) {
preventer.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
},
resetMouseCanceller: function () {
if (POINTERSTATE.mouse.mouseIgnoreJob) {
POINTERSTATE.mouse.mouseIgnoreJob.complete();
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0], e);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0], e);
},
fire: function (type, target, event, preventer) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
preventer: preventer,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct, e);
}
},
fire: function (target, touch, preventer) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
preventer: preventer,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0], e);
},
touchend: function (e) {
this.forward(e.changedTouches[0], e);
},
forward: function (e, preventer) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e,
preventer: preventer
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());(function () {
'use strict';
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var link = document.createElement('link');
link.rel = 'import';
link.href = href;
var list = Polymer.Base.importHref.imported = Polymer.Base.importHref.imported || {};
var cached = list[link.href];
var imprt = cached || link;
var self = this;
var loadListener = function (e) {
e.target.__firedLoad = true;
e.target.removeEventListener('load', loadListener);
e.target.removeEventListener('error', errorListener);
return onload.call(self, e);
};
var errorListener = function (e) {
e.target.__firedError = true;
e.target.removeEventListener('load', loadListener);
e.target.removeEventListener('error', errorListener);
return onerror.call(self, e);
};
if (onload) {
imprt.addEventListener('load', loadListener);
}
if (onerror) {
imprt.addEventListener('error', errorListener);
}
if (cached) {
if (cached.__firedLoad) {
cached.dispatchEvent(new Event('load'));
}
if (cached.__firedError) {
cached.dispatchEvent(new Event('error'));
}
} else {
list[link.href] = link;
optAsync = Boolean(optAsync);
if (optAsync) {
link.setAttribute('async', '');
}
document.head.appendChild(link);
}
return imprt;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
if (!Polymer.Settings.useNativeCustomElements) {
var importHref = Polymer.Base.importHref;
Polymer.Base.importHref = function (href, onload, onerror, optAsync) {
CustomElements.ready = false;
var loadFn = function (e) {
CustomElements.upgradeDocumentTree(document);
CustomElements.ready = true;
if (onload) {
return onload.call(this, e);
}
};
return importHref.call(this, href, loadFn, onerror, optAsync);
};
}
}());Polymer.Bind = {
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: Polymer.Settings.eventDataCache || !Polymer.Settings.isIE
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else if (node[property] !== value) {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, this[property], fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (Polymer.Path.isDescendant(path, prop)) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, Polymer.Path.isDeep(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
var newPath = Polymer.Path.translate(property, path, targetPath);
this._notifyPath(newPath, value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};Polymer.Base.mixin(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
this._applyEffectValue(effect, value);
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (path === name) {
v = value;
} else {
v = model[name];
if (v === undefined && arg.structured) {
v = Polymer.Base._get(name, model);
}
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var matches = Polymer.Path.isAncestor(path, name);
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
var attr = Polymer.CaseMap.camelToDashCase(p);
if (attr[0] === '-') {
this._warn(this._logf('_addPropertyEffects', 'Property ' + p + ' cannot be reflected to attribute ' + attr + ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'));
} else {
this._addPropertyEffect(p, 'reflect', { attribute: attr });
}
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
if (note.kind === 'attribute' && note.name[0] === '-') {
this._warn(this._logf('_addAnnotationEffect', 'Cannot set attribute ' + note.name + ' because "-" is not a valid attribute starting character'));
} else {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = Polymer.Path.root(arg);
a.structured = Polymer.Path.isDeep(arg);
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
value = this._computeFinalAnnotationValue(node, property, value, info);
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
var pinfo = node._propertyInfo && node._propertyInfo[property];
if (pinfo && pinfo.readOnly) {
return;
}
this.__setProperty(property, value, Polymer.Settings.suppressBindingNotifications, node);
}
},
_computeFinalAnnotationValue: function (node, property, value, info) {
if (info.negate) {
value = !value;
}
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind !== 'attribute') {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
}
return value;
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
var avoidInstanceProperties = Boolean(Object.getOwnPropertyDescriptor(document.documentElement, 'properties'));
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._configureInstanceProperties();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(avoidInstanceProperties ? this.__proto__.properties : this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureInstanceProperties: function () {
for (var i in this._propertyEffects) {
if (!usePolyfillProto && this.hasOwnProperty(i)) {
this._configValue(i, this[i]);
delete this[i];
}
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation') {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
value = this._computeFinalAnnotationValue(node, name, value, x.effect);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());(function () {
'use strict';
var Path = Polymer.Path;
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
var v = this._get(path, this, info);
if (arguments.length === 1) {
value = v;
}
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = Path.root(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (Path.matches(effect.value, false, path)) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (!effect.negate && Path.isDescendant(effect.value, path)) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var newPath = Path.translate(effect.value, effect.name, path);
node._notifyPath(newPath, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (Path.matches(effect.trigger.name, effect.trigger.wildcard, path)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (Path.matches(effect.trigger.name, effect.trigger.wildcard, path)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (Path.matches(effect.trigger.name, effect.trigger.wildcard, path)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (Path.isDescendant(a, path)) {
this._notifyPath(Path.translate(a, b, path), value);
} else if (Path.isDescendant(b, path)) {
this._notifyPath(Path.translate(b, a, path), value);
}
}
},
_notifyPathUp: function (path, value) {
var rootName = Path.root(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: Polymer.Settings.eventDataCache || !Polymer.Settings.isIE
});
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
var splicesPath = path + '.splices';
this._notifyPath(splicesPath, change);
this._notifyPath(path + '.length', array.length);
this.__data__[splicesPath] = {
keySplices: null,
indexSplices: null
};
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && !this._hasMixinRules(r$)) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();Polymer.StyleUtil = function () {
var settings = Polymer.Settings;
return {
NATIVE_VARIABLES: Polymer.Settings.useNativeCSSProperties,
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, this.NATIVE_VARIABLES);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRuleInStyle(s, styleRuleCallback, keyframesRuleCallback);
}
}
},
forActiveRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRuleInStyle(s, styleRuleCallback, keyframesRuleCallback, true);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRuleInStyle: function (style, styleRuleCallback, keyframesRuleCallback, onlyActiveRules) {
var rules = this.rulesForStyle(style);
var styleCallback, keyframeCallback;
if (styleRuleCallback) {
styleCallback = function (rule) {
styleRuleCallback(rule, style);
};
}
if (keyframesRuleCallback) {
keyframeCallback = function (rule) {
keyframesRuleCallback(rule, style);
};
}
this.forEachRule(rules, styleCallback, keyframeCallback, onlyActiveRules);
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback, onlyActiveRules) {
if (!node) {
return;
}
var skipRules = false;
if (onlyActiveRules) {
if (node.type === this.ruleTypes.MEDIA_RULE) {
var matchMedia = node.selector.match(this.rx.MEDIA_MATCH);
if (matchMedia) {
if (!window.matchMedia(matchMedia[1]).matches) {
skipRules = true;
}
}
}
}
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback, onlyActiveRules);
}
}
},
applyCss: function (cssText, moniker, target, contextNode) {
var style = this.createScopeStyle(cssText, moniker);
return this.applyStyle(style, target, contextNode);
},
applyStyle: function (style, target, contextNode) {
target = target || document.head;
var after = contextNode && contextNode.nextSibling || target.firstChild;
this.__lastHeadApplyNode = style;
return target.insertBefore(style, after);
},
createScopeStyle: function (cssText, moniker) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
return style;
},
__lastHeadApplyNode: null,
applyStylePlaceHolder: function (moniker) {
var placeHolder = document.createComment(' Shady DOM styles for ' + moniker + ' ');
var after = this.__lastHeadApplyNode ? this.__lastHeadApplyNode.nextSibling : null;
var scope = document.head;
scope.insertBefore(placeHolder, after || scope.firstChild);
this.__lastHeadApplyNode = placeHolder;
return placeHolder;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
if (!e.hasAttribute('preserve-content')) {
cssText += this.cssFromElement(e);
}
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
styleIncludesToTemplate: function (targetTemplate) {
var styles = targetTemplate.content.querySelectorAll('style[include]');
for (var i = 0, s; i < styles.length; i++) {
s = styles[i];
s.parentNode.insertBefore(this._includesToFragment(s.getAttribute('include')), s);
}
},
_includesToFragment: function (styleIncludes) {
var includeArray = styleIncludes.trim().split(' ');
var frag = document.createDocumentFragment();
for (var i = 0; i < includeArray.length; i++) {
var t = Polymer.DomModule.import(includeArray[i], 'template');
if (t) {
this._addStylesToFragment(frag, t.content);
}
}
return frag;
},
_addStylesToFragment: function (frag, source) {
var s$ = source.querySelectorAll('style');
for (var i = 0, s; i < s$.length; i++) {
s = s$[i];
var include = s.getAttribute('include');
if (include) {
frag.appendChild(this._includesToFragment(include));
}
if (s.textContent) {
frag.appendChild(s.cloneNode(true));
}
}
},
isTargetedBuild: function (buildType) {
return settings.useNativeShadow ? buildType === 'shadow' : buildType === 'shady';
},
cssBuildTypeForModule: function (module) {
var dm = Polymer.DomModule.import(module);
if (dm) {
return this.getCssBuildType(dm);
}
},
getCssBuildType: function (element) {
return element.getAttribute('css-build');
},
_findMatchingParen: function (text, start) {
var level = 0;
for (var i = start, l = text.length; i < l; i++) {
switch (text[i]) {
case '(':
level++;
break;
case ')':
if (--level === 0) {
return i;
}
break;
}
}
return -1;
},
processVariableAndFallback: function (str, callback) {
var start = str.indexOf('var(');
if (start === -1) {
return callback(str, '', '', '');
}
var end = this._findMatchingParen(str, start + 3);
var inner = str.substring(start + 4, end);
var prefix = str.substring(0, start);
var suffix = this.processVariableAndFallback(str.substring(end + 1), callback);
var comma = inner.indexOf(',');
if (comma === -1) {
return callback(prefix, inner.trim(), '', suffix);
}
var value = inner.substring(0, comma).trim();
var fallback = inner.substring(comma + 1).trim();
return callback(prefix, value, fallback, suffix);
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply\s*\(?([^);\n]*)\)?/gi,
VAR_CONSUMED: /(--[\w-]+)\s*([:,;)]|$)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
MEDIA_MATCH: /@media[^(]*(\([^)]*\))/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();Polymer.StyleTransformer = function () {
var styleUtil = Polymer.StyleUtil;
var settings = Polymer.Settings;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
var cssBuildType = element.__cssBuild;
var passthrough = settings.useNativeShadow || cssBuildType === 'shady';
var cb;
if (passthrough) {
var self = this;
cb = function (rule) {
rule.selector = self._slottedToContent(rule.selector);
rule.selector = rule.selector.replace(ROOT, ':host > *');
if (callback) {
callback(rule);
}
};
}
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += passthrough ? styleUtil.toCssText(rules, cb) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
rule.selector = rule.transformedSelector = this._transformRuleCss(rule, transformer, scope, hostScope);
},
_transformRuleCss: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
return p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.trim();
selector = this._slottedToContent(selector);
selector = selector.replace(ROOT, ':host > *');
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = this._transformHostSelector(selector, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
_transformHostSelector: function (selector, hostScope) {
var m = selector.match(HOST_PAREN);
var paren = m && m[2].trim() || '';
if (paren) {
if (!paren[0].match(SIMPLE_SELECTOR_PREFIX)) {
var typeSelector = paren.split(SIMPLE_SELECTOR_PREFIX)[0];
if (typeSelector === hostScope) {
return paren;
} else {
return SELECTOR_NO_MATCH;
}
} else {
return selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
}
} else {
return selector.replace(HOST, hostScope);
}
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!settings.useNativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
rule.selector = rule.selector.replace(ROOT, 'html');
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
_slottedToContent: function (cssText) {
return cssText.replace(SLOTTED_PAREN, CONTENT + '> $1');
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var SIMPLE_SELECTOR_PREFIX = /[[.:#*]/;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
var SELECTOR_NO_MATCH = 'should_not_match';
var SLOTTED_PAREN = /(?:::slotted)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
return api;
}();Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();Polymer.ApplyShim = function () {
'use strict';
var styleUtil = Polymer.StyleUtil;
var MIXIN_MATCH = styleUtil.rx.MIXIN_MATCH;
var VAR_ASSIGN = styleUtil.rx.VAR_ASSIGN;
var BAD_VAR = /var\(\s*(--[^,]*),\s*(--[^)]*)\)/g;
var APPLY_NAME_CLEAN = /;\s*/m;
var INITIAL_INHERIT = /^\s*(initial)|(inherit)\s*$/;
var MIXIN_VAR_SEP = '_-_';
var mixinMap = {};
function mapSet(name, props) {
name = name.trim();
mixinMap[name] = {
properties: props,
dependants: {}
};
}
function mapGet(name) {
name = name.trim();
return mixinMap[name];
}
function replaceInitialOrInherit(property, value) {
var match = INITIAL_INHERIT.exec(value);
if (match) {
if (match[1]) {
value = ApplyShim._getInitialValueForProperty(property);
} else {
value = 'apply-shim-inherit';
}
}
return value;
}
function cssTextToMap(text) {
var props = text.split(';');
var property, value;
var out = {};
for (var i = 0, p, sp; i < props.length; i++) {
p = props[i];
if (p) {
sp = p.split(':');
if (sp.length > 1) {
property = sp[0].trim();
value = replaceInitialOrInherit(property, sp.slice(1).join(':'));
out[property] = value;
}
}
}
return out;
}
function invalidateMixinEntry(mixinEntry) {
var currentProto = ApplyShim.__currentElementProto;
var currentElementName = currentProto && currentProto.is;
for (var elementName in mixinEntry.dependants) {
if (elementName !== currentElementName) {
mixinEntry.dependants[elementName].__applyShimInvalid = true;
}
}
}
function produceCssProperties(matchText, propertyName, valueProperty, valueMixin) {
if (valueProperty) {
styleUtil.processVariableAndFallback(valueProperty, function (prefix, value) {
if (value && mapGet(value)) {
valueMixin = '@apply ' + value + ';';
}
});
}
if (!valueMixin) {
return matchText;
}
var mixinAsProperties = consumeCssProperties(valueMixin);
var prefix = matchText.slice(0, matchText.indexOf('--'));
var mixinValues = cssTextToMap(mixinAsProperties);
var combinedProps = mixinValues;
var mixinEntry = mapGet(propertyName);
var oldProps = mixinEntry && mixinEntry.properties;
if (oldProps) {
combinedProps = Object.create(oldProps);
combinedProps = Polymer.Base.mixin(combinedProps, mixinValues);
} else {
mapSet(propertyName, combinedProps);
}
var out = [];
var p, v;
var needToInvalidate = false;
for (p in combinedProps) {
v = mixinValues[p];
if (v === undefined) {
v = 'initial';
}
if (oldProps && !(p in oldProps)) {
needToInvalidate = true;
}
out.push(propertyName + MIXIN_VAR_SEP + p + ': ' + v);
}
if (needToInvalidate) {
invalidateMixinEntry(mixinEntry);
}
if (mixinEntry) {
mixinEntry.properties = combinedProps;
}
if (valueProperty) {
prefix = matchText + ';' + prefix;
}
return prefix + out.join('; ') + ';';
}
function fixVars(matchText, varA, varB) {
return 'var(' + varA + ',' + 'var(' + varB + '))';
}
function atApplyToCssProperties(mixinName, fallbacks) {
mixinName = mixinName.replace(APPLY_NAME_CLEAN, '');
var vars = [];
var mixinEntry = mapGet(mixinName);
if (!mixinEntry) {
mapSet(mixinName, {});
mixinEntry = mapGet(mixinName);
}
if (mixinEntry) {
var currentProto = ApplyShim.__currentElementProto;
if (currentProto) {
mixinEntry.dependants[currentProto.is] = currentProto;
}
var p, parts, f;
for (p in mixinEntry.properties) {
f = fallbacks && fallbacks[p];
parts = [
p,
': var(',
mixinName,
MIXIN_VAR_SEP,
p
];
if (f) {
parts.push(',', f);
}
parts.push(')');
vars.push(parts.join(''));
}
}
return vars.join('; ');
}
function consumeCssProperties(text) {
var m;
while (m = MIXIN_MATCH.exec(text)) {
var matchText = m[0];
var mixinName = m[1];
var idx = m.index;
var applyPos = idx + matchText.indexOf('@apply');
var afterApplyPos = idx + matchText.length;
var textBeforeApply = text.slice(0, applyPos);
var textAfterApply = text.slice(afterApplyPos);
var defaults = cssTextToMap(textBeforeApply);
var replacement = atApplyToCssProperties(mixinName, defaults);
text = [
textBeforeApply,
replacement,
textAfterApply
].join('');
MIXIN_MATCH.lastIndex = idx + replacement.length;
}
return text;
}
var ApplyShim = {
_measureElement: null,
_map: mixinMap,
_separator: MIXIN_VAR_SEP,
transform: function (styles, elementProto) {
this.__currentElementProto = elementProto;
styleUtil.forRulesInStyles(styles, this._boundFindDefinitions);
styleUtil.forRulesInStyles(styles, this._boundFindApplications);
if (elementProto) {
elementProto.__applyShimInvalid = false;
}
this.__currentElementProto = null;
},
_findDefinitions: function (rule) {
var cssText = rule.parsedCssText;
cssText = cssText.replace(BAD_VAR, fixVars);
cssText = cssText.replace(VAR_ASSIGN, produceCssProperties);
rule.cssText = cssText;
if (rule.selector === ':root') {
rule.selector = ':host > *';
}
},
_findApplications: function (rule) {
rule.cssText = consumeCssProperties(rule.cssText);
},
transformRule: function (rule) {
this._findDefinitions(rule);
this._findApplications(rule);
},
_getInitialValueForProperty: function (property) {
if (!this._measureElement) {
this._measureElement = document.createElement('meta');
this._measureElement.style.all = 'initial';
document.head.appendChild(this._measureElement);
}
return window.getComputedStyle(this._measureElement).getPropertyValue(property);
}
};
ApplyShim._boundTransformRule = ApplyShim.transformRule.bind(ApplyShim);
ApplyShim._boundFindDefinitions = ApplyShim._findDefinitions.bind(ApplyShim);
ApplyShim._boundFindApplications = ApplyShim._findApplications.bind(ApplyShim);
return ApplyShim;
}();(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
var applyShim = Polymer.ApplyShim;
var settings = Polymer.Settings;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle && this.__cssBuild !== 'shady') {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow;
}
if (!nativeShadow) {
this._scopeStyle = styleUtil.applyStylePlaceHolder(this.is);
}
this.__cssBuild = styleUtil.cssBuildTypeForModule(this.is);
},
_prepShimStyles: function () {
if (this._template) {
var hasTargetedCssBuild = styleUtil.isTargetedBuild(this.__cssBuild);
if (settings.useNativeCSSProperties && this.__cssBuild === 'shadow' && hasTargetedCssBuild) {
if (settings.preserveStyleIncludes) {
styleUtil.styleIncludesToTemplate(this._template);
}
return;
}
this._styles = this._styles || this._collectStyles();
if (settings.useNativeCSSProperties && !this.__cssBuild) {
applyShim.transform(this._styles, this);
}
var cssText = settings.useNativeCSSProperties && hasTargetedCssBuild ? this._styles.length && this._styles[0].textContent.trim() : styleTransformer.elementStyles(this);
this._prepStyleProperties();
if (!this._needsStyleProperties() && cssText) {
styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null, this._scopeStyle);
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());Polymer.StyleProperties = function () {
'use strict';
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var IS_IE = navigator.userAgent.match('Trident');
var settings = Polymer.Settings;
return {
decorateStyles: function (styles, scope) {
var self = this, props = {}, keyframes = [], ruleIndex = 0;
var scopeSelector = styleTransformer._calcHostScope(scope.is, scope.extends);
styleUtil.forRulesInStyles(styles, function (rule, style) {
self.decorateRule(rule);
rule.index = ruleIndex++;
self.whenHostOrRootRule(scope, rule, style, function (info) {
if (rule.parent.type === styleUtil.ruleTypes.MEDIA_RULE) {
scope.__notStyleScopeCacheable = true;
}
if (info.isHost) {
var hostContextOrFunction = info.selector.split(' ').some(function (s) {
return s.indexOf(scopeSelector) === 0 && s.length !== scopeSelector.length;
});
scope.__notStyleScopeCacheable = scope.__notStyleScopeCacheable || hostContextOrFunction;
}
});
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var value;
var any;
while (m = rx.exec(cssText)) {
value = (m[2] || m[3]).trim();
if (value !== 'inherit') {
properties[m[1].trim()] = value;
}
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CONSUMED.exec(cssText)) {
var name = m[1];
if (m[2] !== ':') {
props[name] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (prefix, value, fallback, suffix) {
var propertyValue = self.valueForProperty(props[value], props);
if (!propertyValue || propertyValue === 'initial') {
propertyValue = self.valueForProperty(props[fallback] || fallback, props) || fallback;
} else if (propertyValue === 'apply-shim-inherit') {
propertyValue = 'inherit';
}
return prefix + (propertyValue || '') + suffix;
};
property = styleUtil.processVariableAndFallback(property, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
this.rx.MIXIN_MATCH.lastIndex = 0;
m = this.rx.MIXIN_MATCH.exec(p);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [];
styleUtil.forActiveRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
var selectorToMatch = rule.transformedSelector || rule.parsedSelector;
if (element && rule.propertyInfo.properties && selectorToMatch) {
if (matchesSelector.call(element, selectorToMatch)) {
self.collectProperties(rule, props);
addToBitMask(rule.index, o);
}
}
});
return {
properties: props,
key: o
};
},
_rootSelector: /:root|:host\s*>\s*\*/,
_checkRoot: function (hostScope, selector) {
return Boolean(selector.match(this._rootSelector)) || hostScope === 'html' && selector.indexOf('html') > -1;
},
whenHostOrRootRule: function (scope, rule, style, callback) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (!rule.propertyInfo.properties) {
return;
}
var hostScope = scope.is ? styleTransformer._calcHostScope(scope.is, scope.extends) : 'html';
var parsedSelector = rule.parsedSelector;
var isRoot = this._checkRoot(hostScope, parsedSelector);
var isHost = !isRoot && parsedSelector.indexOf(':host') === 0;
var cssBuild = scope.__cssBuild || style.__cssBuild;
if (cssBuild === 'shady') {
isRoot = parsedSelector === hostScope + ' > *.' + hostScope || parsedSelector.indexOf('html') > -1;
isHost = !isRoot && parsedSelector.indexOf(hostScope) === 0;
}
if (!isRoot && !isHost) {
return;
}
var selectorToMatch = hostScope;
if (isHost) {
if (settings.useNativeShadow && !rule.transformedSelector) {
rule.transformedSelector = styleTransformer._transformRuleCss(rule, styleTransformer._transformComplexSelector, scope.is, hostScope);
}
selectorToMatch = rule.transformedSelector || rule.parsedSelector;
}
if (isRoot && hostScope === 'html') {
selectorToMatch = rule.transformedSelector || rule.parsedSelector;
}
callback({
selector: selectorToMatch,
isHost: isHost,
isRoot: isRoot
});
},
hostAndRootPropertiesForScope: function (scope) {
var hostProps = {}, rootProps = {}, self = this;
styleUtil.forActiveRulesInStyles(scope._styles, function (rule, style) {
self.whenHostOrRootRule(scope, rule, style, function (info) {
var element = scope._element || scope;
if (matchesSelector.call(element, info.selector)) {
if (info.isHost) {
self.collectProperties(rule, hostProps);
} else {
self.collectProperties(rule, rootProps);
}
}
});
});
return {
rootProps: rootProps,
hostProps: hostProps
};
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!settings.useNativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!settings.useNativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !settings.useNativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (settings.useNativeShadow) {
if (element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, element.root, element._scopeStyle);
}
} else {
if (!style) {
if (cssText) {
style = styleUtil.applyCss(cssText, selector, null, element._scopeStyle);
}
} else if (!style.parentNode) {
if (IS_IE && cssText.indexOf('@media') > -1) {
style.textContent = cssText;
}
styleUtil.applyStyle(style, null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
updateNativeStyleProperties: function (element, properties) {
var oldPropertyNames = element.__customStyleProperties;
if (oldPropertyNames) {
for (var i = 0; i < oldPropertyNames.length; i++) {
element.style.removeProperty(oldPropertyNames[i]);
}
}
var propertyNames = [];
for (var p in properties) {
if (properties[p] !== null) {
element.style.setProperty(p, properties[p]);
propertyNames.push(p);
}
}
element.__customStyleProperties = propertyNames;
},
rx: styleUtil.rx,
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var nativeVariables = Polymer.Settings.useNativeCSSProperties;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
_element: Polymer.DomApi.wrap(document.documentElement),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles, this);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.hostAndRootPropertiesForScope(this).rootProps;
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
hasStyleProperties: function () {
return Boolean(this._properties);
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
if (nativeVariables) {
styleProperties.updateNativeStyleProperties(document.documentElement, this.customStyle);
}
}
};
return api;
}();(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
var nativeVariables = Polymer.Settings.useNativeCSSProperties;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
if (!nativeVariables) {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles, this) : null;
}
},
customStyle: null,
getComputedStyleValue: function (property) {
if (!nativeVariables && !this._styleProperties) {
this._computeStyleProperties();
}
return !nativeVariables && this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(!nativeVariables && this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_validateApplyShim: function () {
if (this.__applyShimInvalid) {
Polymer.ApplyShim.transform(this._styles, this.__proto__);
var cssText = styleTransformer.elementStyles(this);
if (nativeShadow) {
var templateStyle = this._template.content.querySelector('style');
if (templateStyle) {
templateStyle.textContent = cssText;
}
} else {
var shadyStyle = this._scopeStyle && this._scopeStyle.nextSibling;
if (shadyStyle) {
shadyStyle.textContent = cssText;
}
}
}
},
_beforeAttached: function () {
if ((!this._scopeSelector || this.__stylePropertiesInvalid) && this._needsStyleProperties()) {
this.__stylePropertiesInvalid = false;
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
var scopeCacheable = !this.__notStyleScopeCacheable;
if (scopeCacheable) {
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
}
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
if (scopeCacheable) {
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
}
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
var hostAndRootProps = propertyUtils.hostAndRootPropertiesForScope(this);
this.mixin(props, hostAndRootProps.hostProps);
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, hostAndRootProps.rootProps);
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (nativeVariables) {
propertyUtils.updateNativeStyleProperties(this, this.customStyle);
} else {
if (this.isAttached) {
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
} else {
this.__stylePropertiesInvalid = true;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
if (this.factoryImpl) {
this._prepConstructor();
}
this._prepStyles();
},
_finishRegisterFeatures: function () {
this._prepTemplate();
this._prepShimStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure(this.__data__);
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._validateApplyShim();
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
var applyShim = Polymer.ApplyShim;
var debounce = Polymer.Debounce;
var settings = Polymer.Settings;
var updateDebouncer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this.__appliedElement = this.__appliedElement || this;
this.__cssBuild = styleUtil.getCssBuildType(this);
if (this.__appliedElement !== this) {
this.__appliedElement.__cssBuild = this.__cssBuild;
}
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement;
if (!settings.useNativeCSSProperties) {
this.__needsUpdateStyles = styleDefaults.hasStyleProperties();
styleDefaults.addStyle(e);
}
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_updateStyles: function () {
Polymer.updateStyles();
},
_apply: function (initialApply) {
var e = this.__appliedElement;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (!e.textContent) {
return;
}
var buildType = this.__cssBuild;
var targetedBuild = styleUtil.isTargetedBuild(buildType);
if (settings.useNativeCSSProperties && targetedBuild) {
return;
}
var styleRules = styleUtil.rulesForStyle(e);
if (!targetedBuild) {
styleUtil.forEachRule(styleRules, function (rule) {
styleTransformer.documentRule(rule);
});
if (settings.useNativeCSSProperties && !buildType) {
applyShim.transform([e]);
}
}
if (settings.useNativeCSSProperties) {
e.textContent = styleUtil.toCssText(styleRules);
} else {
var self = this;
var fn = function fn() {
self._flushCustomProperties();
};
if (initialApply) {
Polymer.RenderStatus.whenReady(fn);
} else {
fn();
}
}
},
_flushCustomProperties: function () {
if (this.__needsUpdateStyles) {
this.__needsUpdateStyles = false;
updateDebouncer = debounce(updateDebouncer, this._updateStyles);
} else {
this._applyCustomProperties();
}
},
_applyCustomProperties: function () {
var element = this.__appliedElement;
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
if (!rules) {
return;
}
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
proto._propertyEffects = proto._propertyEffects || {};
proto._propertyEffects[parentProp] = effects;
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
if (val && n == '_propertyEffects') {
var pe = Polymer.Base.mixin({}, val);
template._propertyEffects = Polymer.Base.mixin(pe, proto._propertyEffects);
} else {
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var root = Polymer.Path.root(path);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized._notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = Polymer.Path.root(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
return value;
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: !Polymer.Settings.suppressTemplateNotifications,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
notifyDomChange: { type: Boolean },
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
if (!Polymer.Settings.suppressTemplateNotifications || this.notifyDomChange) {
this.fire('dom-change');
}
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
if (!this._instances[i].isPlaceholder)
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
},
notifyDomChange: { type: Boolean }
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
if (!Polymer.Settings.suppressTemplateNotifications || this.notifyDomChange) {
this.fire('dom-change');
}
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance.__setProperty(prop, value, true);
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});Polymer({
is: 'dom-bind',
properties: { notifyDomChange: { type: Boolean } },
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_configureInstanceProperties: function () {
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
if (!Polymer.Settings.suppressTemplateNotifications || this.notifyDomChange) {
this.fire('dom-change');
}
}
});
Polymer({
      is: 'app-drawer',

      properties: {
        /**
         * The opened state of the drawer.
         */
        opened: {
          type: Boolean,
          value: false,
          notify: true,
          reflectToAttribute: true
        },

        /**
         * The drawer does not have a scrim and cannot be swiped close.
         */
        persistent: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
        },

        /**
         * The transition duration of the drawer in milliseconds.
         */
        transitionDuration: {
          type: Number,
          value: 200
        },

        /**
         * The alignment of the drawer on the screen ('left', 'right', 'start' or 'end').
         * 'start' computes to left and 'end' to right in LTR layout and vice versa in RTL
         * layout.
         */
        align: {
          type: String,
          value: 'left'
        },

        /**
         * The computed, read-only position of the drawer on the screen ('left' or 'right').
         */
        position: {
          type: String,
          readOnly: true,
          reflectToAttribute: true
        },

        /**
         * Create an area at the edge of the screen to swipe open the drawer.
         */
        swipeOpen: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
        },

        /**
         * Trap keyboard focus when the drawer is opened and not persistent.
         */
        noFocusTrap: {
          type: Boolean,
          value: false
        },

        /**
         * Disables swiping on the drawer.
         */
        disableSwipe: {
          type: Boolean,
          value: false
        }
      },

      observers: [
        'resetLayout(position, isAttached)',
        '_resetPosition(align, isAttached)',
        '_styleTransitionDuration(transitionDuration)',
        '_openedPersistentChanged(opened, persistent)'
      ],

      _translateOffset: 0,

      _trackDetails: null,

      _drawerState: 0,

      _boundEscKeydownHandler: null,

      _firstTabStop: null,

      _lastTabStop: null,

      attached: function() {
        // Only transition the drawer after its first render (e.g. app-drawer-layout
        // may need to set the initial opened state which should not be transitioned).
        this._styleTransitionDuration(0);
        Polymer.RenderStatus.afterNextRender(this, function() {
          this._styleTransitionDuration(this.transitionDuration);
          this._boundEscKeydownHandler = this._escKeydownHandler.bind(this);
          this.addEventListener('keydown', this._tabKeydownHandler.bind(this))

          // Only listen for horizontal track so you can vertically scroll inside the drawer.
          this.listen(this, 'track', '_track');
          this.setScrollDirection('y');
        });

        this.fire('app-drawer-attached');
      },

      detached: function() {
        document.removeEventListener('keydown', this._boundEscKeydownHandler);
      },

      /**
       * Opens the drawer.
       */
      open: function() {
        this.opened = true;
      },

      /**
       * Closes the drawer.
       */
      close: function() {
        this.opened = false;
      },

      /**
       * Toggles the drawer open and close.
       */
      toggle: function() {
        this.opened = !this.opened;
      },

      /**
       * Gets the width of the drawer.
       *
       * @return {number} The width of the drawer in pixels.
       */
      getWidth: function() {
        return this.$.contentContainer.offsetWidth;
      },

      /**
       * Resets the layout. The event fired is used by app-drawer-layout to position the
       * content.
       *
       * @method resetLayout
       */
      resetLayout: function() {
        this.fire('app-drawer-reset-layout');
      },

      _isRTL: function() {
        return window.getComputedStyle(this).direction === 'rtl';
      },

      _resetPosition: function() {
        switch (this.align) {
          case 'start':
            this._setPosition(this._isRTL() ? 'right' : 'left');
            return;
          case 'end':
            this._setPosition(this._isRTL() ? 'left' : 'right');
            return;
        }
        this._setPosition(this.align);
      },

      _escKeydownHandler: function(event) {
        var ESC_KEYCODE = 27;
        if (event.keyCode === ESC_KEYCODE) {
          // Prevent any side effects if app-drawer closes.
          event.preventDefault();
          this.close();
        }
      },

      _track: function(event) {
        if (this.persistent || this.disableSwipe) {
          return;
        }

        // Disable user selection on desktop.
        event.preventDefault();

        switch (event.detail.state) {
          case 'start':
            this._trackStart(event);
            break;
          case 'track':
            this._trackMove(event);
            break;
          case 'end':
            this._trackEnd(event);
            break;
        }
      },

      _trackStart: function(event) {
        this._drawerState = this._DRAWER_STATE.TRACKING;

        // Disable transitions since style attributes will reflect user track events.
        this._styleTransitionDuration(0);
        this.style.visibility = 'visible';

        var rect = this.$.contentContainer.getBoundingClientRect();
        if (this.position === 'left') {
          this._translateOffset = rect.left;
        } else {
          this._translateOffset = rect.right - window.innerWidth;
        }

        this._trackDetails = [];
      },

      _trackMove: function(event) {
        this._translateDrawer(event.detail.dx + this._translateOffset);

        // Use Date.now() since event.timeStamp is inconsistent across browsers (e.g. most
        // browsers use milliseconds but FF 44 uses microseconds).
        this._trackDetails.push({
          dx: event.detail.dx,
          timeStamp: Date.now()
        });
      },

      _trackEnd: function(event) {
        var x = event.detail.dx + this._translateOffset;
        var drawerWidth = this.getWidth();
        var isPositionLeft = this.position === 'left';
        var isInEndState = isPositionLeft ? (x >= 0 || x <= -drawerWidth) :
          (x <= 0 || x >= drawerWidth);

        if (!isInEndState) {
          // No longer need the track events after this method returns - allow them to be GC'd.
          var trackDetails = this._trackDetails;
          this._trackDetails = null;

          this._flingDrawer(event, trackDetails);
          if (this._drawerState === this._DRAWER_STATE.FLINGING) {
            return;
          }
        }

        // If the drawer is not flinging, toggle the opened state based on the position of
        // the drawer.
        var halfWidth = drawerWidth / 2;
        if (event.detail.dx < -halfWidth) {
          this.opened = this.position === 'right';
        } else if (event.detail.dx > halfWidth) {
          this.opened = this.position === 'left';
        }

        if (isInEndState) {
          this.debounce('_resetDrawerState', this._resetDrawerState);
        } else {
          this.debounce('_resetDrawerState', this._resetDrawerState, this.transitionDuration);
        }

        this._styleTransitionDuration(this.transitionDuration);
        this._resetDrawerTranslate();
        this.style.visibility = '';
      },

      _calculateVelocity: function(event, trackDetails) {
        // Find the oldest track event that is within 100ms using binary search.
        var now = Date.now();
        var timeLowerBound = now - 100;
        var trackDetail;
        var min = 0;
        var max = trackDetails.length - 1;

        while (min <= max) {
          // Floor of average of min and max.
          var mid = (min + max) >> 1;
          var d = trackDetails[mid];
          if (d.timeStamp >= timeLowerBound) {
            trackDetail = d;
            max = mid - 1;
          } else {
            min = mid + 1;
          }
        }

        if (trackDetail) {
          var dx = event.detail.dx - trackDetail.dx;
          var dt = (now - trackDetail.timeStamp) || 1;
          return dx / dt;
        }
        return 0;
      },

      _flingDrawer: function(event, trackDetails) {
        var velocity = this._calculateVelocity(event, trackDetails);

        // Do not fling if velocity is not above a threshold.
        if (Math.abs(velocity) < this._MIN_FLING_THRESHOLD) {
          return;
        }

        this._drawerState = this._DRAWER_STATE.FLINGING;

        var x = event.detail.dx + this._translateOffset;
        var drawerWidth = this.getWidth();
        var isPositionLeft = this.position === 'left';
        var isVelocityPositive = velocity > 0;
        var isClosingLeft = !isVelocityPositive && isPositionLeft;
        var isClosingRight = isVelocityPositive && !isPositionLeft;
        var dx;
        if (isClosingLeft) {
          dx = -(x + drawerWidth);
        } else if (isClosingRight) {
          dx = (drawerWidth - x);
        } else {
          dx = -x;
        }

        // Enforce a minimum transition velocity to make the drawer feel snappy.
        if (isVelocityPositive) {
          velocity = Math.max(velocity, this._MIN_TRANSITION_VELOCITY);
          this.opened = this.position === 'left';
        } else {
          velocity = Math.min(velocity, -this._MIN_TRANSITION_VELOCITY);
          this.opened = this.position === 'right';
        }

        // Calculate the amount of time needed to finish the transition based on the
        // initial slope of the timing function.
        var t = this._FLING_INITIAL_SLOPE * dx / velocity
        this._styleTransitionDuration(t);
        this._styleTransitionTimingFunction(this._FLING_TIMING_FUNCTION);

        this._resetDrawerTranslate();
        this.debounce('_resetDrawerState', this._resetDrawerState, t);
      },

      _styleTransitionDuration: function(duration) {
        this.style.transitionDuration = duration + 'ms';
        this.$.contentContainer.style.transitionDuration = duration + 'ms';
        this.$.scrim.style.transitionDuration = duration + 'ms';
      },

      _styleTransitionTimingFunction: function(timingFunction) {
        this.$.contentContainer.style.transitionTimingFunction = timingFunction;
        this.$.scrim.style.transitionTimingFunction = timingFunction;
      },

      _translateDrawer: function(x) {
        var drawerWidth = this.getWidth();

        if (this.position === 'left') {
          x = Math.max(-drawerWidth, Math.min(x, 0));
          this.$.scrim.style.opacity = 1 + x / drawerWidth;
        } else {
          x = Math.max(0, Math.min(x, drawerWidth));
          this.$.scrim.style.opacity = 1 - x / drawerWidth;
        }

        this.translate3d(x + 'px', '0', '0', this.$.contentContainer);
      },

      _resetDrawerTranslate: function() {
        this.$.scrim.style.opacity = '';
        this.transform('', this.$.contentContainer);
      },

      _resetDrawerState: function() {
        var oldState = this._drawerState;

        // If the drawer was flinging, we need to reset the style attributes.
        if (oldState === this._DRAWER_STATE.FLINGING) {
          this._styleTransitionDuration(this.transitionDuration);
          this._styleTransitionTimingFunction('');
          this.style.visibility = '';
        }

        if (this.opened) {
          this._drawerState = this.persistent ?
            this._DRAWER_STATE.OPENED_PERSISTENT : this._DRAWER_STATE.OPENED;
        } else {
          this._drawerState = this._DRAWER_STATE.CLOSED;
        }

        if (oldState !== this._drawerState) {
          if (this._drawerState === this._DRAWER_STATE.OPENED) {
            this._setKeyboardFocusTrap();
            document.addEventListener('keydown', this._boundEscKeydownHandler);
            document.body.style.overflow = 'hidden';
          } else {
            document.removeEventListener('keydown', this._boundEscKeydownHandler);
            document.body.style.overflow = '';
          }

          // Don't fire the event on initial load.
          if (oldState !== this._DRAWER_STATE.INIT) {
            this.fire('app-drawer-transitioned');
          }
        }
      },

      _setKeyboardFocusTrap: function() {
        if (this.noFocusTrap) {
          return;
        }

        // NOTE: Unless we use /deep/ (which we shouldn't since it's deprecated), this will
        // not select focusable elements inside shadow roots.
        var focusableElementsSelector = [
            'a[href]:not([tabindex="-1"])',
            'area[href]:not([tabindex="-1"])',
            'input:not([disabled]):not([tabindex="-1"])',
            'select:not([disabled]):not([tabindex="-1"])',
            'textarea:not([disabled]):not([tabindex="-1"])',
            'button:not([disabled]):not([tabindex="-1"])',
            'iframe:not([tabindex="-1"])',
            '[tabindex]:not([tabindex="-1"])',
            '[contentEditable=true]:not([tabindex="-1"])'
          ].join(',');
        var focusableElements = Polymer.dom(this).querySelectorAll(focusableElementsSelector);

        if (focusableElements.length > 0) {
          this._firstTabStop = focusableElements[0];
          this._lastTabStop = focusableElements[focusableElements.length - 1];
        } else {
          // Reset saved tab stops when there are no focusable elements in the drawer.
          this._firstTabStop = null;
          this._lastTabStop = null;
        }

        // Focus on app-drawer if it has non-zero tabindex. Otherwise, focus the first focusable
        // element in the drawer, if it exists. Use the tabindex attribute since the this.tabIndex
        // property in IE/Edge returns 0 (instead of -1) when the attribute is not set.
        var tabindex = this.getAttribute('tabindex');
        if (tabindex && parseInt(tabindex, 10) > -1) {
          this.focus();
        } else if (this._firstTabStop) {
          this._firstTabStop.focus();
        }
      },

      _tabKeydownHandler: function(event) {
        if (this.noFocusTrap) {
          return;
        }

        var TAB_KEYCODE = 9;
        if (this._drawerState === this._DRAWER_STATE.OPENED && event.keyCode === TAB_KEYCODE) {
          if (event.shiftKey) {
            if (this._firstTabStop && Polymer.dom(event).localTarget === this._firstTabStop) {
              event.preventDefault();
              this._lastTabStop.focus();
            }
          } else {
            if (this._lastTabStop && Polymer.dom(event).localTarget === this._lastTabStop) {
              event.preventDefault();
              this._firstTabStop.focus();
            }
          }
        }
      },

      _openedPersistentChanged: function() {
        // Use a debounce timer instead of transitionend since transitionend won't fire when
        // app-drawer is display: none.
        this.debounce('_resetDrawerState', this._resetDrawerState, this.transitionDuration);
      },

      _MIN_FLING_THRESHOLD: 0.2,

      _MIN_TRANSITION_VELOCITY: 1.2,

      _FLING_TIMING_FUNCTION: 'cubic-bezier(0.667, 1, 0.667, 1)',

      _FLING_INITIAL_SLOPE: 1.5,

      _DRAWER_STATE: {
        INIT: 0,
        OPENED: 1,
        OPENED_PERSISTENT: 2,
        CLOSED: 3,
        TRACKING: 4,
        FLINGING: 5
      }

      /**
       * Fired when the layout of app-drawer is attached.
       *
       * @event app-drawer-attached
       */

      /**
       * Fired when the layout of app-drawer has changed.
       *
       * @event app-drawer-reset-layout
       */

      /**
       * Fired when app-drawer has finished transitioning.
       *
       * @event app-drawer-transitioned
       */
    });
Polymer({

    is: 'iron-media-query',

    properties: {

      /**
       * The Boolean return value of the media query.
       */
      queryMatches: {
        type: Boolean,
        value: false,
        readOnly: true,
        notify: true
      },

      /**
       * The CSS media query to evaluate.
       */
      query: {
        type: String,
        observer: 'queryChanged'
      },

      /**
       * If true, the query attribute is assumed to be a complete media query
       * string rather than a single media feature.
       */
      full: {
        type: Boolean,
        value: false
      },

      /**
       * @type {function(MediaQueryList)}
       */
      _boundMQHandler: {
        value: function() {
          return this.queryHandler.bind(this);
        }
      },

      /**
       * @type {MediaQueryList}
       */
      _mq: {
        value: null
      }
    },

    attached: function() {
      this.style.display = 'none';
      this.queryChanged();
    },

    detached: function() {
      this._remove();
    },

    _add: function() {
      if (this._mq) {
        this._mq.addListener(this._boundMQHandler);
      }
    },

    _remove: function() {
      if (this._mq) {
        this._mq.removeListener(this._boundMQHandler);
      }
      this._mq = null;
    },

    queryChanged: function() {
      this._remove();
      var query = this.query;
      if (!query) {
        return;
      }
      if (!this.full && query[0] !== '(') {
        query = '(' + query + ')';
      }
      this._mq = window.matchMedia(query);
      this._add();
      this.queryHandler(this._mq);
    },

    queryHandler: function(mq) {
      this._setQueryMatches(mq.matches);
    }

  });
/**
   * `IronResizableBehavior` is a behavior that can be used in Polymer elements to
   * coordinate the flow of resize events between "resizers" (elements that control the
   * size or hidden state of their children) and "resizables" (elements that need to be
   * notified when they are resized or un-hidden by their parents in order to take
   * action on their new measurements).
   *
   * Elements that perform measurement should add the `IronResizableBehavior` behavior to
   * their element definition and listen for the `iron-resize` event on themselves.
   * This event will be fired when they become showing after having been hidden,
   * when they are resized explicitly by another resizable, or when the window has been
   * resized.
   *
   * Note, the `iron-resize` event is non-bubbling.
   *
   * @polymerBehavior Polymer.IronResizableBehavior
   * @demo demo/index.html
   **/
  Polymer.IronResizableBehavior = {
    properties: {
      /**
       * The closest ancestor element that implements `IronResizableBehavior`.
       */
      _parentResizable: {
        type: Object,
        observer: '_parentResizableChanged'
      },

      /**
       * True if this element is currently notifying its descedant elements of
       * resize.
       */
      _notifyingDescendant: {
        type: Boolean,
        value: false
      }
    },

    listeners: {
      'iron-request-resize-notifications': '_onIronRequestResizeNotifications'
    },

    created: function() {
      // We don't really need property effects on these, and also we want them
      // to be created before the `_parentResizable` observer fires:
      this._interestedResizables = [];
      this._boundNotifyResize = this.notifyResize.bind(this);
    },

    attached: function() {
      this.fire('iron-request-resize-notifications', null, {
        node: this,
        bubbles: true,
        cancelable: true
      });

      if (!this._parentResizable) {
        window.addEventListener('resize', this._boundNotifyResize);
        this.notifyResize();
      }
    },

    detached: function() {
      if (this._parentResizable) {
        this._parentResizable.stopResizeNotificationsFor(this);
      } else {
        window.removeEventListener('resize', this._boundNotifyResize);
      }

      this._parentResizable = null;
    },

    /**
     * Can be called to manually notify a resizable and its descendant
     * resizables of a resize change.
     */
    notifyResize: function() {
      if (!this.isAttached) {
        return;
      }

      this._interestedResizables.forEach(function(resizable) {
        if (this.resizerShouldNotify(resizable)) {
          this._notifyDescendant(resizable);
        }
      }, this);

      this._fireResize();
    },

    /**
     * Used to assign the closest resizable ancestor to this resizable
     * if the ancestor detects a request for notifications.
     */
    assignParentResizable: function(parentResizable) {
      this._parentResizable = parentResizable;
    },

    /**
     * Used to remove a resizable descendant from the list of descendants
     * that should be notified of a resize change.
     */
    stopResizeNotificationsFor: function(target) {
      var index = this._interestedResizables.indexOf(target);

      if (index > -1) {
        this._interestedResizables.splice(index, 1);
        this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
      }
    },

    /**
     * This method can be overridden to filter nested elements that should or
     * should not be notified by the current element. Return true if an element
     * should be notified, or false if it should not be notified.
     *
     * @param {HTMLElement} element A candidate descendant element that
     * implements `IronResizableBehavior`.
     * @return {boolean} True if the `element` should be notified of resize.
     */
    resizerShouldNotify: function(element) { return true; },

    _onDescendantIronResize: function(event) {
      if (this._notifyingDescendant) {
        event.stopPropagation();
        return;
      }

      // NOTE(cdata): In ShadowDOM, event retargetting makes echoing of the
      // otherwise non-bubbling event "just work." We do it manually here for
      // the case where Polymer is not using shadow roots for whatever reason:
      if (!Polymer.Settings.useShadow) {
        this._fireResize();
      }
    },

    _fireResize: function() {
      this.fire('iron-resize', null, {
        node: this,
        bubbles: false
      });
    },

    _onIronRequestResizeNotifications: function(event) {
      var target = event.path ? event.path[0] : event.target;

      if (target === this) {
        return;
      }

      if (this._interestedResizables.indexOf(target) === -1) {
        this._interestedResizables.push(target);
        this.listen(target, 'iron-resize', '_onDescendantIronResize');
      }

      target.assignParentResizable(this);
      this._notifyDescendant(target);

      event.stopPropagation();
    },

    _parentResizableChanged: function(parentResizable) {
      if (parentResizable) {
        window.removeEventListener('resize', this._boundNotifyResize);
      }
    },

    _notifyDescendant: function(descendant) {
      // NOTE(cdata): In IE10, attached is fired on children first, so it's
      // important not to notify them if the parent is not attached yet (or
      // else they will get redundantly notified when the parent attaches).
      if (!this.isAttached) {
        return;
      }

      this._notifyingDescendant = true;
      descendant.notifyResize();
      this._notifyingDescendant = false;
    }
  };
Polymer({
      is: 'app-drawer-layout',

      behaviors: [
        Polymer.IronResizableBehavior
      ],

      properties: {
        /**
         * If true, ignore `responsiveWidth` setting and force the narrow layout.
         */
        forceNarrow: {
          type: Boolean,
          value: false
        },

        /**
         * If the viewport's width is smaller than this value, the panel will change to narrow
         * layout. In the mode the drawer will be closed.
         */
        responsiveWidth: {
          type: String,
          value: '640px'
        },

        /**
         * Returns true if it is in narrow layout. This is useful if you need to show/hide
         * elements based on the layout.
         */
        narrow: {
          type: Boolean,
          readOnly: true,
          notify: true
        },

        /**
         * If true, the drawer will initially be opened when in narrow layout mode.
         */
        openedWhenNarrow: {
          type: Boolean,
          value: false
        }
      },

      listeners: {
        'tap': '_tapHandler',
        'app-drawer-attached': '_resetDrawerState',
        'app-drawer-reset-layout': 'resetLayout',
        'iron-resize': 'resetLayout'
      },

      observers: [
        'resetLayout(narrow, isAttached)',
        '_narrowChanged(narrow, isAttached)'
      ],

      /**
       * A reference to the app-drawer element.
       *
       * @property drawer
       */
      get drawer() {
        return Polymer.dom(this.$.drawerContent).getDistributedNodes()[0];
      },

      _tapHandler: function(e) {
        var target = Polymer.dom(e).localTarget;
        if (target && target.hasAttribute('drawer-toggle')) {
          var drawer = this.drawer;
          if (drawer && !drawer.persistent) {
            drawer.toggle();
          }
        }
      },

      resetLayout: function() {
        this.debounce('_resetLayout', function() {
          var drawer = this.drawer;
          var contentContainer = this.$.contentContainer;

          if (this.narrow || !drawer) {
            contentContainer.style.marginLeft = '';
            contentContainer.style.marginRight = '';
          } else {
            var drawerWidth = drawer.getWidth();
            if (drawer.position == 'right') {
              contentContainer.style.marginLeft = '';
              contentContainer.style.marginRight = drawerWidth + 'px';
            } else {
              contentContainer.style.marginLeft = drawerWidth + 'px';
              contentContainer.style.marginRight = '';
            }
          }
        });
      },

      _resetDrawerState: function() {
        this.debounce('_resetDrawerState', function() {
          var drawer = this.drawer;
          if (!drawer) {
            return;
          }

          if (this.narrow) {
            drawer.opened = this.openedWhenNarrow;
            drawer.persistent = false;
          } else {
            drawer.opened = drawer.persistent = true;
          }
        });
      },

      _narrowChanged: function(narrow) {
        this.toggleClass('narrow', narrow, this.$.contentContainer);
        this._resetDrawerState();
        this.notifyResize();
      },

      _onQueryMatchesChanged: function(event) {
        this._setNarrow(event.detail.value);
      },

      _computeMediaQuery: function(forceNarrow, responsiveWidth) {
        return forceNarrow ? '(min-width: 0px)' : '(max-width: ' + responsiveWidth + ')';
      }
    });
/**
   * `Polymer.IronScrollTargetBehavior` allows an element to respond to scroll events from a
   * designated scroll target.
   *
   * Elements that consume this behavior can override the `_scrollHandler`
   * method to add logic on the scroll event.
   *
   * @demo demo/scrolling-region.html Scrolling Region
   * @demo demo/document.html Document Element
   * @polymerBehavior
   */
  Polymer.IronScrollTargetBehavior = {

    properties: {

      /**
       * Specifies the element that will handle the scroll event
       * on the behalf of the current element. This is typically a reference to an element,
       * but there are a few more posibilities:
       *
       * ### Elements id
       *
       *```html
       * <div id="scrollable-element" style="overflow: auto;">
       *  <x-element scroll-target="scrollable-element">
       *    <!-- Content-->
       *  </x-element>
       * </div>
       *```
       * In this case, the `scrollTarget` will point to the outer div element.
       *
       * ### Document scrolling
       *
       * For document scrolling, you can use the reserved word `document`:
       *
       *```html
       * <x-element scroll-target="document">
       *   <!-- Content -->
       * </x-element>
       *```
       *
       * ### Elements reference
       *
       *```js
       * appHeader.scrollTarget = document.querySelector('#scrollable-element');
       *```
       *
       * @type {Element}
       */
      scrollTarget: {
        type: Object,
        value: function() {
          return this._defaultScrollTarget;
        }
      }
    },

    observers: [
      '_scrollTargetChanged(scrollTarget, isAttached)'
    ],

    /**
     * True if the event listener should be installed.
     */
    _shouldHaveListener: true,

    _scrollTargetChanged: function(scrollTarget, isAttached) {
      var eventTarget;

      if (this._oldScrollTarget) {
        this._toggleScrollListener(false, this._oldScrollTarget);
        this._oldScrollTarget = null;
      }
      if (!isAttached) {
        return;
      }
      // Support element id references
      if (scrollTarget === 'document') {

        this.scrollTarget = this._doc;

      } else if (typeof scrollTarget === 'string') {

        this.scrollTarget = this.domHost ? this.domHost.$[scrollTarget] :
            Polymer.dom(this.ownerDocument).querySelector('#' + scrollTarget);

      } else if (this._isValidScrollTarget()) {

        this._boundScrollHandler = this._boundScrollHandler || this._scrollHandler.bind(this);
        this._oldScrollTarget = scrollTarget;
        this._toggleScrollListener(this._shouldHaveListener, scrollTarget);

      }
    },

    /**
     * Runs on every scroll event. Consumer of this behavior may override this method.
     *
     * @protected
     */
    _scrollHandler: function scrollHandler() {},

    /**
     * The default scroll target. Consumers of this behavior may want to customize
     * the default scroll target.
     *
     * @type {Element}
     */
    get _defaultScrollTarget() {
      return this._doc;
    },

    /**
     * Shortcut for the document element
     *
     * @type {Element}
     */
    get _doc() {
      return this.ownerDocument.documentElement;
    },

    /**
     * Gets the number of pixels that the content of an element is scrolled upward.
     *
     * @type {number}
     */
    get _scrollTop() {
      if (this._isValidScrollTarget()) {
        return this.scrollTarget === this._doc ? window.pageYOffset : this.scrollTarget.scrollTop;
      }
      return 0;
    },

    /**
     * Gets the number of pixels that the content of an element is scrolled to the left.
     *
     * @type {number}
     */
    get _scrollLeft() {
      if (this._isValidScrollTarget()) {
        return this.scrollTarget === this._doc ? window.pageXOffset : this.scrollTarget.scrollLeft;
      }
      return 0;
    },

    /**
     * Sets the number of pixels that the content of an element is scrolled upward.
     *
     * @type {number}
     */
    set _scrollTop(top) {
      if (this.scrollTarget === this._doc) {
        window.scrollTo(window.pageXOffset, top);
      } else if (this._isValidScrollTarget()) {
        this.scrollTarget.scrollTop = top;
      }
    },

    /**
     * Sets the number of pixels that the content of an element is scrolled to the left.
     *
     * @type {number}
     */
    set _scrollLeft(left) {
      if (this.scrollTarget === this._doc) {
        window.scrollTo(left, window.pageYOffset);
      } else if (this._isValidScrollTarget()) {
        this.scrollTarget.scrollLeft = left;
      }
    },

    /**
     * Scrolls the content to a particular place.
     *
     * @method scroll
     * @param {number} left The left position
     * @param {number} top The top position
     */
    scroll: function(left, top) {
       if (this.scrollTarget === this._doc) {
        window.scrollTo(left, top);
      } else if (this._isValidScrollTarget()) {
        this.scrollTarget.scrollLeft = left;
        this.scrollTarget.scrollTop = top;
      }
    },

    /**
     * Gets the width of the scroll target.
     *
     * @type {number}
     */
    get _scrollTargetWidth() {
      if (this._isValidScrollTarget()) {
        return this.scrollTarget === this._doc ? window.innerWidth : this.scrollTarget.offsetWidth;
      }
      return 0;
    },

    /**
     * Gets the height of the scroll target.
     *
     * @type {number}
     */
    get _scrollTargetHeight() {
      if (this._isValidScrollTarget()) {
        return this.scrollTarget === this._doc ? window.innerHeight : this.scrollTarget.offsetHeight;
      }
      return 0;
    },

    /**
     * Returns true if the scroll target is a valid HTMLElement.
     *
     * @return {boolean}
     */
    _isValidScrollTarget: function() {
      return this.scrollTarget instanceof HTMLElement;
    },

    _toggleScrollListener: function(yes, scrollTarget) {
      if (!this._boundScrollHandler) {
        return;
      }
      var eventTarget = scrollTarget === this._doc ? window : scrollTarget;

      if (yes) {
        eventTarget.addEventListener('scroll', this._boundScrollHandler);
      } else {
        eventTarget.removeEventListener('scroll', this._boundScrollHandler);
      }
    },

    /**
     * Enables or disables the scroll event listener.
     *
     * @param {boolean} yes True to add the event, False to remove it.
     */
    toggleScrollListener: function(yes) {
      this._shouldHaveListener = yes;
      this._toggleScrollListener(yes, this.scrollTarget);
    }

  };
Polymer.AppLayout = Polymer.AppLayout || {};

  Polymer.AppLayout._scrollEffects = Polymer.AppLayout._scrollEffects || {};

  Polymer.AppLayout.scrollTimingFunction = function easeOutQuad(t, b, c, d) {
    t /= d;
    return -c * t*(t-2) + b;
  };

  /**
   * Registers a scroll effect to be used in elements that implement the
   * `Polymer.AppScrollEffectsBehavior` behavior.
   *
   * @param {string} effectName The effect name.
   * @param {Object} effectDef The effect definition.
   */
  Polymer.AppLayout.registerEffect = function registerEffect(effectName, effectDef) {
    if (Polymer.AppLayout._scrollEffects[effectName] != null) {
      throw new Error('effect `'+ effectName + '` is already registered.');
    }
    Polymer.AppLayout._scrollEffects[effectName] = effectDef;
  };

  /**
   * Scrolls to a particular set of coordinates in a scroll target.
   * If the scroll target is not defined, then it would use the main document as the target.
   *
   * To scroll in a smooth fashion, you can set the option `behavior: 'smooth'`. e.g.
   *
   * ```js
   * Polymer.AppLayout.scroll({top: 0, behavior: 'smooth'});
   * ```
   *
   * To scroll in a silent mode, without notifying scroll changes to any app-layout elements,
   * you can set the option `behavior: 'silent'`. This is particularly useful we you are using
   * `app-header` and you desire to scroll to the top of a scrolling region without running
   * scroll effects. e.g.
   *
   * ```js
   * Polymer.AppLayout.scroll({top: 0, behavior: 'silent'});
   * ```
   *
   * @param {Object} options {top: Number, left: Number, behavior: String(smooth | silent)}
   */
  Polymer.AppLayout.scroll = function scroll(options) {
    options = options || {};

    var docEl = document.documentElement;
    var target = options.target || docEl;
    var hasNativeScrollBehavior = 'scrollBehavior' in target.style && target.scroll;
    var scrollClassName = 'app-layout-silent-scroll';
    var scrollTop = options.top || 0;
    var scrollLeft = options.left || 0;
    var scrollTo = target === docEl ? window.scrollTo :
      function scrollTo(scrollLeft, scrollTop) {
        target.scrollLeft = scrollLeft;
        target.scrollTop = scrollTop;
      };

    if (options.behavior === 'smooth') {

      if (hasNativeScrollBehavior) {

        target.scroll(options);

      } else {

        var timingFn = Polymer.AppLayout.scrollTimingFunction;
        var startTime = Date.now();
        var currentScrollTop = target === docEl ? window.pageYOffset : target.scrollTop;
        var currentScrollLeft = target === docEl ? window.pageXOffset : target.scrollLeft;
        var deltaScrollTop = scrollTop - currentScrollTop;
        var deltaScrollLeft = scrollLeft - currentScrollLeft;
        var duration = 300;
        var updateFrame = (function updateFrame() {
          var now = Date.now();
          var elapsedTime = now - startTime;

          if (elapsedTime < duration) {
            scrollTo(timingFn(elapsedTime, currentScrollLeft, deltaScrollLeft, duration),
                timingFn(elapsedTime, currentScrollTop, deltaScrollTop, duration));
            requestAnimationFrame(updateFrame);
          } else {
            scrollTo(scrollLeft, scrollTop);
          }
        }).bind(this);

        updateFrame();
      }

    } else if (options.behavior === 'silent') {

      docEl.classList.add(scrollClassName);

      // Browsers keep the scroll momentum even if the bottom of the scrolling content
      // was reached. This means that calling scroll({top: 0, behavior: 'silent'}) when
      // the momentum is still going will result in more scroll events and thus scroll effects.
      // This seems to only apply when using document scrolling.
      // Therefore, when should we remove the class from the document element?

      clearInterval(Polymer.AppLayout._scrollTimer);

      Polymer.AppLayout._scrollTimer = setTimeout(function() {
        docEl.classList.remove(scrollClassName);
        Polymer.AppLayout._scrollTimer = null;
      }, 100);

      scrollTo(scrollLeft, scrollTop);

    } else {

      scrollTo(scrollLeft, scrollTop);

    }
  };
/**
   * `Polymer.AppScrollEffectsBehavior` provides an interface that allows an element to use scrolls effects.
   *
   * ### Importing the app-layout effects
   *
   * app-layout provides a set of scroll effects that can be used by explicitly importing
   * `app-scroll-effects.html`:
   *
   * ```html
   * <link rel="import" href="/bower_components/app-layout/app-scroll-effects/app-scroll-effects.html">
   * ```
   *
   * The scroll effects can also be used by individually importing
   * `app-layout/app-scroll-effects/effects/[effectName].html`. For example:
   *
   * ```html
   *  <link rel="import" href="/bower_components/app-layout/app-scroll-effects/effects/waterfall.html">
   * ```
   *
   * ### Consuming effects
   *
   * Effects can be consumed via the `effects` property. For example:
   *
   * ```html
   * <app-header effects="waterfall"></app-header>
   * ```
   *
   * ### Creating scroll effects
   *
   * You may want to create a custom scroll effect if you need to modify the CSS of an element
   * based on the scroll position.
   *
   * A scroll effect definition is an object with `setUp()`, `tearDown()` and `run()` functions.
   *
   * To register the effect, you can use `Polymer.AppLayout.registerEffect(effectName, effectDef)`
   * For example, let's define an effect that resizes the header's logo:
   *
   * ```js
   * Polymer.AppLayout.registerEffect('resizable-logo', {
   *   setUp: function(config) {
   *     // the effect's config is passed to the setUp.
   *     this._fxResizeLogo = { logo: Polymer.dom(this).querySelector('[logo]') };
   *   },
   *
   *   run: function(progress) {
   *      // the progress of the effect
   *      this.transform('scale3d(' + progress + ', '+ progress +', 1)',  this._fxResizeLogo.logo);
   *   },
   *
   *   tearDown: function() {
   *      // clean up and reset of states
   *      delete this._fxResizeLogo;
   *   }
   * });
   * ```
   * Now, you can consume the effect:
   *
   * ```html
   * <app-header id="appHeader" effects="resizable-logo">
   *   <img logo src="logo.svg">
   * </app-header>
   * ```
   *
   * ### Imperative API
   *
   * ```js
   * var logoEffect = appHeader.createEffect('resizable-logo', effectConfig);
   * // run the effect: logoEffect.run(progress);
   * // tear down the effect: logoEffect.tearDown();
   * ```
   *
   * ### Configuring effects
   *
   * For effects installed via the `effects` property, their configuration can be set
   * via the `effectsConfig` property. For example:
   *
   * ```html
   * <app-header effects="waterfall"
   *   effects-config='{"waterfall": {"startsAt": 0, "endsAt": 0.5}}'>
   * </app-header>
   * ```
   *
   * All effects have a `startsAt` and `endsAt` config property. They specify at what
   * point the effect should start and end. This value goes from 0 to 1 inclusive.
   *
   * @polymerBehavior
   */
  Polymer.AppScrollEffectsBehavior = [
    Polymer.IronScrollTargetBehavior,
   {

    properties: {

      /**
       * A space-separated list of the effects names that will be triggered when the user scrolls.
       * e.g. `waterfall parallax-background` installs the `waterfall` and `parallax-background`.
       */
      effects: {
        type: String
      },

      /**
       * An object that configurates the effects installed via the `effects` property. e.g.
       * ```js
       *  element.effectsConfig = {
       *   "blend-background": {
       *     "startsAt": 0.5
       *   }
       * };
       * ```
       * Every effect has at least two config properties: `startsAt` and `endsAt`.
       * These properties indicate when the event should start and end respectively
       * and relative to the overall element progress. So for example, if `blend-background`
       * starts at `0.5`, the effect will only start once the current element reaches 0.5
       * of its progress. In this context, the progress is a value in the range of `[0, 1]`
       * that indicates where this element is on the screen relative to the viewport.
       */
      effectsConfig: {
        type: Object,
        value: function() {
          return {};
        }
      },

      /**
       * Disables CSS transitions and scroll effects on the element.
       */
      disabled: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      },

      /**
       * Allows to set a `scrollTop` threshold. When greater than 0, `thresholdTriggered`
       * is true only when the scroll target's `scrollTop` has reached this value.
       *
       * For example, if `threshold = 100`, `thresholdTriggered` is true when the `scrollTop`
       * is at least `100`.
       */
      threshold: {
        type: Number,
        value: 0
      },

      /**
       * True if the `scrollTop` threshold (set in `scrollTopThreshold`) has
       * been reached.
       */
      thresholdTriggered: {
        type: Boolean,
        notify: true,
        readOnly: true,
        reflectToAttribute: true
      }
    },

    observers: [
      '_effectsChanged(effects, effectsConfig, isAttached)'
    ],

    /**
     * Updates the scroll state. This method should be overridden
     * by the consumer of this behavior.
     *
     * @method _updateScrollState
     */
    _updateScrollState: function() {},

    /**
     * Returns true if the current element is on the screen.
     * That is, visible in the current viewport. This method should be
     * overridden by the consumer of this behavior.
     *
     * @method isOnScreen
     * @return {boolean}
     */
    isOnScreen: function() {
      return false;
    },

    /**
     * Returns true if there's content below the current element. This method
     * should be overridden by the consumer of this behavior.
     *
     * @method isContentBelow
     * @return {boolean}
     */
    isContentBelow: function() {
      return false;
    },

    /**
     * List of effects handlers that will take place during scroll.
     *
     * @type {Array<Function>}
     */
    _effectsRunFn: null,

    /**
     * List of the effects definitions installed via the `effects` property.
     *
     * @type {Array<Object>}
     */
    _effects: null,

    /**
     * The clamped value of `_scrollTop`.
     * @type number
     */
    get _clampedScrollTop() {
      return Math.max(0, this._scrollTop);
    },

    detached: function() {
      this._tearDownEffects();
    },

    /**
     * Creates an effect object from an effect's name that can be used to run
     * effects programmatically.
     *
     * @method createEffect
     * @param {string} effectName The effect's name registered via `Polymer.AppLayout.registerEffect`.
     * @param {Object=} effectConfig The effect config object. (Optional)
     * @return {Object} An effect object with the following functions:
     *
     *  * `effect.setUp()`, Sets up the requirements for the effect.
     *       This function is called automatically before the `effect` function returns.
     *  * `effect.run(progress, y)`, Runs the effect given a `progress`.
     *  * `effect.tearDown()`, Cleans up any DOM nodes or element references used by the effect.
     *
     * Example:
     * ```js
     * var parallax = element.createEffect('parallax-background');
     * // runs the effect
     * parallax.run(0.5, 0);
     * ```
     */
    createEffect: function(effectName, effectConfig) {
      var effectDef = Polymer.AppLayout._scrollEffects[effectName];
      if (!effectDef) {
        throw new ReferenceError(this._getUndefinedMsg(effectName));
      }
      var prop = this._boundEffect(effectDef, effectConfig || {});
      prop.setUp();
      return prop;
    },

    /**
     * Called when `effects` or `effectsConfig` changes.
     */
    _effectsChanged: function(effects, effectsConfig, isAttached) {
      this._tearDownEffects();

      if (effects === '' || !isAttached) {
        return;
      }
      effects.split(' ').forEach(function(effectName) {
        var effectDef;
        if (effectName !== '') {
          if ((effectDef = Polymer.AppLayout._scrollEffects[effectName])) {
            this._effects.push(this._boundEffect(effectDef, effectsConfig[effectName]));
          } else {
            console.warn(this._getUndefinedMsg(effectName));
          }
        }
      }, this);

      this._setUpEffect();
    },

    /**
     * Forces layout
     */
    _layoutIfDirty: function() {
      return this.offsetWidth;
    },

    /**
     * Returns an effect object bound to the current context.
     *
     * @param {Object} effectDef
     * @param {Object=} effectsConfig The effect config object if the effect accepts config values. (Optional)
     */
    _boundEffect: function(effectDef, effectsConfig) {
      effectsConfig = effectsConfig || {};
      var startsAt = parseFloat(effectsConfig.startsAt || 0);
      var endsAt = parseFloat(effectsConfig.endsAt || 1);
      var deltaS = endsAt - startsAt;
      var noop = function() {};
      // fast path if possible
      var runFn = (startsAt === 0 && endsAt === 1) ? effectDef.run :
        function(progress, y) {
          effectDef.run.call(this,
              Math.max(0, (progress - startsAt) / deltaS), y);
        };
      return {
        setUp: effectDef.setUp ? effectDef.setUp.bind(this, effectsConfig) : noop,
        run: effectDef.run ? runFn.bind(this) : noop,
        tearDown: effectDef.tearDown ? effectDef.tearDown.bind(this) : noop
      };
    },

    /**
     * Sets up the effects.
     */
    _setUpEffect: function() {
      if (this.isAttached && this._effects) {
        this._effectsRunFn = [];
        this._effects.forEach(function(effectDef) {
          // install the effect only if no error was reported
          if (effectDef.setUp() !== false) {
            this._effectsRunFn.push(effectDef.run);
          }
        }, this);
      }
    },

    /**
     * Tears down the effects.
     */
    _tearDownEffects: function() {
      if (this._effects) {
        this._effects.forEach(function(effectDef) {
          effectDef.tearDown();
        });
      }
      this._effectsRunFn = [];
      this._effects = [];
    },

    /**
     * Runs the effects.
     *
     * @param {number} p The progress
     * @param {number} y The top position of the current element relative to the viewport.
     */
    _runEffects: function(p, y) {
      if (this._effectsRunFn) {
        this._effectsRunFn.forEach(function(run) {
          run(p, y);
        });
      }
    },

    /**
     * Overrides the `_scrollHandler`.
     */
    _scrollHandler: function() {
      if (!this.disabled) {
        var scrollTop = this._clampedScrollTop;
        this._updateScrollState(scrollTop);
        if (this.threshold > 0) {
          this._setThresholdTriggered(scrollTop >= this.threshold);
        }
      }
    },

    /**
     * Override this method to return a reference to a node in the local DOM.
     * The node is consumed by a scroll effect.
     *
     * @param {string} id The id for the node.
     */
    _getDOMRef: function(id) {
      console.warn('_getDOMRef', '`'+ id +'` is undefined');
    },

    _getUndefinedMsg: function(effectName) {
      return 'Scroll effect `' + effectName + '` is undefined. ' +
          'Did you forget to import app-layout/app-scroll-effects/effects/' + effectName + '.html ?';
    }

  }];
Polymer({
      is: 'app-header',

      behaviors: [
        Polymer.AppScrollEffectsBehavior,
        Polymer.IronResizableBehavior
      ],

      properties: {
        /**
         * If true, the header will automatically collapse when scrolling down.
         * That is, the `sticky` element remains visible when the header is fully condensed
         * whereas the rest of the elements will collapse below `sticky` element.
         *
         * By default, the `sticky` element is the first toolbar in the light DOM:
         *
         *```html
         * <app-header condenses>
         *   <app-toolbar>This toolbar remains on top</app-toolbar>
         *   <app-toolbar></app-toolbar>
         *   <app-toolbar></app-toolbar>
         * </app-header>
         * ```
         *
         * Additionally, you can specify which toolbar or element remains visible in condensed mode
         * by adding the `sticky` attribute to that element. For example: if we want the last
         * toolbar to remain visible, we can add the `sticky` attribute to it.
         *
         *```html
         * <app-header condenses>
         *   <app-toolbar></app-toolbar>
         *   <app-toolbar></app-toolbar>
         *   <app-toolbar sticky>This toolbar remains on top</app-toolbar>
         * </app-header>
         * ```
         *
         * Note the `sticky` element must be a direct child of `app-header`.
         */
        condenses: {
          type: Boolean,
          value: false
        },

        /**
         * Mantains the header fixed at the top so it never moves away.
         */
        fixed: {
          type: Boolean,
          value: false
        },

        /**
         * Slides back the header when scrolling back up.
         */
        reveals: {
          type: Boolean,
          value: false
        },

        /**
         * Displays a shadow below the header.
         */
        shadow: {
          type: Boolean,
          reflectToAttribute: true,
          value: false
        }
      },

      observers: [
        'resetLayout(isAttached, condenses, fixed)'
      ],

      listeners: {
        'iron-resize': '_resizeHandler'
      },

      /**
       * A cached offsetHeight of the current element.
       *
       * @type {number}
       */
      _height: 0,

      /**
       * The distance in pixels the header will be translated to when scrolling.
       *
       * @type {number}
       */
      _dHeight: 0,

      /**
       * The offsetTop of `_stickyEl`
       *
       * @type {number}
       */
      _stickyElTop: 0,

      /**
       * The element that remains visible when the header condenses.
       *
       * @type {HTMLElement}
       */
      _stickyEl: null,

      /**
       * The header's top value used for the `transformY`
       *
       * @type {number}
       */
      _top: 0,

      /**
       * The current scroll progress.
       *
       * @type {number}
       */
      _progress: 0,

      _wasScrollingDown: false,
      _initScrollTop: 0,
      _initTimestamp: 0,
      _lastTimestamp: 0,
      _lastScrollTop: 0,

      /**
       * The distance the header is allowed to move away.
       *
       * @type {number}
       */
      get _maxHeaderTop() {
        return this.fixed ? this._dHeight : this._height + 5;
      },

      /**
       * Returns a reference to the sticky element.
       *
       * @return {HTMLElement}?
       */
      _getStickyEl: function() {
        /** @type {HTMLElement} */
        var stickyEl;
        var nodes = Polymer.dom(this.$.content).getDistributedNodes();

        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].nodeType === Node.ELEMENT_NODE) {
            var node = /** @type {HTMLElement} */ (nodes[i]);
            if (node.hasAttribute('sticky')) {
              stickyEl = node;
              break;
            } else if (!stickyEl) {
              stickyEl = node;
            }
          }
        }
        return stickyEl;
      },

      /**
       * Resets the layout. If you changed the size of app-header via CSS
       * you can notify the changes by either firing the `iron-resize` event
       * or calling `resetLayout` directly.
       *
       * @method resetLayout
       */
      resetLayout: function() {
        this.debounce('_resetLayout', function() {
          // noop if the header isn't visible
          if (this.offsetWidth === 0 && this.offsetHeight === 0) {
            return;
          }

          var scrollTop = this._clampedScrollTop;
          var firstSetup = this._height === 0 || scrollTop === 0;
          var currentDisabled = this.disabled;

          this._height = this.offsetHeight;
          this._stickyEl = this._getStickyEl();
          this.disabled = true;

          // prepare for measurement
          if  (!firstSetup) {
            this._updateScrollState(0, true);
          }
          if (this._mayMove()) {
            this._dHeight = this._stickyEl ? this._height - this._stickyEl.offsetHeight : 0;
          } else {
            this._dHeight = 0;
          }

          this._stickyElTop = this._stickyEl ? this._stickyEl.offsetTop : 0;
          this._setUpEffect();

          if (firstSetup) {
            this._updateScrollState(scrollTop, true);
          } else {
            this._updateScrollState(this._lastScrollTop, true);
            this._layoutIfDirty();
          }
          // restore no transition
          this.disabled = currentDisabled;
          this.fire('app-header-reset-layout');
        });
      },

      /**
       * Updates the scroll state.
       *
       * @param {number} scrollTop
       * @param {boolean=} forceUpdate (default: false)
       */
      _updateScrollState: function(scrollTop, forceUpdate) {
        if (this._height === 0) {
          return;
        }

        var progress = 0;
        var top = 0;
        var lastTop = this._top;
        var lastScrollTop = this._lastScrollTop;
        var maxHeaderTop = this._maxHeaderTop;
        var dScrollTop = scrollTop - this._lastScrollTop;
        var absDScrollTop = Math.abs(dScrollTop);
        var isScrollingDown = scrollTop > this._lastScrollTop;
        var now = performance.now();

        if (this._mayMove()) {
          top = this._clamp(this.reveals ? lastTop + dScrollTop : scrollTop, 0, maxHeaderTop);
        }

        if (scrollTop >= this._dHeight) {
          top = this.condenses && !this.fixed ? Math.max(this._dHeight, top) : top;
          this.style.transitionDuration = '0ms';
        }

        if (this.reveals && !this.disabled && absDScrollTop < 100) {
          // set the initial scroll position
          if (now - this._initTimestamp > 300 || this._wasScrollingDown !== isScrollingDown) {
            this._initScrollTop = scrollTop;
            this._initTimestamp = now;
          }

          if (scrollTop >= maxHeaderTop) {
            // check if the header is allowed to snap
            if (Math.abs(this._initScrollTop - scrollTop) > 30 || absDScrollTop > 10) {
              if (isScrollingDown && scrollTop >= maxHeaderTop) {
                top = maxHeaderTop;
              } else if (!isScrollingDown && scrollTop >= this._dHeight) {
                top = this.condenses && !this.fixed ? this._dHeight : 0;
              }
              var scrollVelocity = dScrollTop / (now - this._lastTimestamp);
              this.style.transitionDuration = this._clamp((top - lastTop) / scrollVelocity, 0, 300) + 'ms';
            } else {
              top = this._top;
            }
          }
        }

        if (this._dHeight === 0) {
          progress = scrollTop > 0 ? 1 : 0;
        } else {
          progress = top / this._dHeight;
        }

        if (!forceUpdate) {
          this._lastScrollTop = scrollTop;
          this._top = top;
          this._wasScrollingDown = isScrollingDown;
          this._lastTimestamp = now;
        }

        if (forceUpdate || progress !== this._progress || lastTop !== top || scrollTop === 0) {
          this._progress = progress;
          this._runEffects(progress, top);
          this._transformHeader(top);
        }
      },

      /**
       * Returns true if the current header is allowed to move as the user scrolls.
       *
       * @return {boolean}
       */
      _mayMove: function() {
        return this.condenses || !this.fixed;
      },

      /**
       * Returns true if the current header will condense based on the size of the header
       * and the `consenses` property.
       *
       * @return {boolean}
       */
      willCondense: function() {
        return this._dHeight > 0 && this.condenses;
      },

      /**
       * Returns true if the current element is on the screen.
       * That is, visible in the current viewport.
       *
       * @method isOnScreen
       * @return {boolean}
       */
      isOnScreen: function() {
        return this._height !== 0 && this._top < this._height;
      },

      /**
       * Returns true if there's content below the current element.
       *
       * @method isContentBelow
       * @return {boolean}
       */
      isContentBelow: function() {
        if (this._top === 0) {
          return this._clampedScrollTop > 0;
        }
        return this._clampedScrollTop - this._maxHeaderTop >= 0;
      },

      /**
       * Transforms the header.
       *
       * @param {number} y
       */
      _transformHeader: function(y) {
        this.translate3d(0, (-y) + 'px', 0);
        if (this._stickyEl) {
          this.translate3d(0, this.condenses && y >= this._stickyElTop ?
              (Math.min(y, this._dHeight) - this._stickyElTop) + 'px' : 0,  0, this._stickyEl);
        }
      },

      _resizeHandler: function() {
        this.resetLayout();
      },

      _clamp: function(v, min, max) {
        return Math.min(max, Math.max(min, v));
      },

      _ensureBgContainers: function() {
        if (!this._bgContainer) {
          this._bgContainer = document.createElement('div');
          this._bgContainer.id = 'background';

          this._bgRear = document.createElement('div');
          this._bgRear.id = 'backgroundRearLayer';
          this._bgContainer.appendChild(this._bgRear);

          this._bgFront = document.createElement('div');
          this._bgFront.id = 'backgroundFrontLayer';
          this._bgContainer.appendChild(this._bgFront);

          Polymer.dom(this.root).insertBefore(this._bgContainer, this.$.contentContainer);
        }
      },

      _getDOMRef: function(id) {
        switch (id) {
          case 'backgroundFrontLayer':
            this._ensureBgContainers();
            return this._bgFront;
          case 'backgroundRearLayer':
            this._ensureBgContainers();
            return this._bgRear;
          case 'background':
            this._ensureBgContainers();
            return this._bgContainer;
          case 'mainTitle':
            return Polymer.dom(this).querySelector('[main-title]');
          case 'condensedTitle':
            return Polymer.dom(this).querySelector('[condensed-title]');
        }
        return null;
      },

      /**
       * Returns an object containing the progress value of the scroll effects
       * and the top position of the header.
       *
       * @method getScrollState
       * @return {Object}
       */
      getScrollState: function() {
        return { progress: this._progress, top: this._top };
      }

      /**
       * Fires when the layout of `app-header` changed.
       *
       * @event app-header-reset-layout
       */
    });
Polymer({
      is: 'app-header-layout',

      behaviors: [
        Polymer.IronResizableBehavior
      ],

      properties: {
        /**
         * If true, the current element will have its own scrolling region.
         * Otherwise, it will use the document scroll to control the header.
         */
        hasScrollingRegion: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
        }
      },

      listeners: {
        'iron-resize': '_resizeHandler',
        'app-header-reset-layout': '_resetLayoutHandler'
      },

      observers: [
        'resetLayout(isAttached, hasScrollingRegion)'
      ],

      /**
       * A reference to the app-header element.
       *
       * @property header
       */
      get header() {
        return Polymer.dom(this.$.header).getDistributedNodes()[0];
      },

      /**
       * Resets the layout. This method is automatically called when the element is attached
       * to the DOM.
       *
       * @method resetLayout
       */
      resetLayout: function() {
        this._updateScroller();
        this.debounce('_resetLayout', this._updateContentPosition);
      },

      _updateContentPosition: function() {
        var header = this.header;
        if (!this.isAttached || !header) {
          return;
        }
        // Get header height here so that style reads are batched together before style writes
        // (i.e. getBoundingClientRect() below).
        var headerHeight = header.offsetHeight;
        // Update the header position.
        if (!this.hasScrollingRegion) {
          var rect = this.getBoundingClientRect();
          var rightOffset = document.documentElement.clientWidth - rect.right;
          header.style.left = rect.left + 'px';
          header.style.right = rightOffset + 'px';
        } else {
          header.style.left = '';
          header.style.right = '';
        }
        // Update the content container position.
        var containerStyle = this.$.contentContainer.style;
        if (header.fixed && !header.willCondense() && this.hasScrollingRegion) {
          // If the header size does not change and we're using a scrolling region, exclude
          // the header area from the scrolling region so that the header doesn't overlap
          // the scrollbar.
          containerStyle.marginTop = headerHeight + 'px';
          containerStyle.paddingTop = '';
        } else {
          containerStyle.paddingTop = headerHeight + 'px';
          containerStyle.marginTop = '';
        }
      },

      _updateScroller: function() {
        if (!this.isAttached) {
          return;
        }
        var header = this.header;
        if (header) {
          header.scrollTarget = this.hasScrollingRegion ?
              this.$.contentContainer : this.ownerDocument.documentElement;
        }
      },

      _resizeHandler: function() {
        this.resetLayout();
      },

      _resetLayoutHandler: function(e) {
        this.resetLayout();
        e.stopPropagation();
      }

    });
Polymer({
      is: 'app-toolbar'
    });
(function() {

    // monostate data
    var metaDatas = {};
    var metaArrays = {};
    var singleton = null;

    Polymer.IronMeta = Polymer({

      is: 'iron-meta',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * The key used to store `value` under the `type` namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          observer: '_valueChanged'
        },

        /**
         * If true, `value` is set to the iron-meta instance itself.
         */
         self: {
          type: Boolean,
          observer: '_selfChanged'
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      hostAttributes: {
        hidden: true
      },

      /**
       * Only runs if someone invokes the factory/constructor directly
       * e.g. `new Polymer.IronMeta()`
       *
       * @param {{type: (string|undefined), key: (string|undefined), value}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
              case 'value':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key, old) {
        this._resetRegistration(old);
      },

      _valueChanged: function(value) {
        this._resetRegistration(this.key);
      },

      _selfChanged: function(self) {
        if (self) {
          this.value = this;
        }
      },

      _typeChanged: function(type) {
        this._unregisterKey(this.key);
        if (!metaDatas[type]) {
          metaDatas[type] = {};
        }
        this._metaData = metaDatas[type];
        if (!metaArrays[type]) {
          metaArrays[type] = [];
        }
        this.list = metaArrays[type];
        this._registerKeyValue(this.key, this.value);
      },

      /**
       * Retrieves meta data value by key.
       *
       * @method byKey
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      },

      _resetRegistration: function(oldKey) {
        this._unregisterKey(oldKey);
        this._registerKeyValue(this.key, this.value);
      },

      _unregisterKey: function(key) {
        this._unregister(key, this._metaData, this.list);
      },

      _registerKeyValue: function(key, value) {
        this._register(key, value, this._metaData, this.list);
      },

      _register: function(key, value, data, list) {
        if (key && data && value !== undefined) {
          data[key] = value;
          list.push(value);
        }
      },

      _unregister: function(key, data, list) {
        if (key && data) {
          if (key in data) {
            var value = data[key];
            delete data[key];
            this.arrayDelete(list, value);
          }
        }
      }

    });

    Polymer.IronMeta.getIronMeta = function getIronMeta() {
       if (singleton === null) {
         singleton = new Polymer.IronMeta();
       }
       return singleton;
     };

    /**
    `iron-meta-query` can be used to access infomation stored in `iron-meta`.

    Examples:

    If I create an instance like this:

        <iron-meta key="info" value="foo/bar"></iron-meta>

    Note that value="foo/bar" is the metadata I've defined. I could define more
    attributes or use child nodes to define additional metadata.

    Now I can access that element (and it's metadata) from any `iron-meta-query` instance:

         var value = new Polymer.IronMetaQuery({key: 'info'}).value;

    @group Polymer Iron Elements
    @element iron-meta-query
    */
    Polymer.IronMetaQuery = Polymer({

      is: 'iron-meta-query',

      properties: {

        /**
         * The type of meta-data.  All meta-data of the same type is stored
         * together.
         */
        type: {
          type: String,
          value: 'default',
          observer: '_typeChanged'
        },

        /**
         * Specifies a key to use for retrieving `value` from the `type`
         * namespace.
         */
        key: {
          type: String,
          observer: '_keyChanged'
        },

        /**
         * The meta-data to store or retrieve.
         */
        value: {
          type: Object,
          notify: true,
          readOnly: true
        },

        /**
         * Array of all meta-data values for the given type.
         */
        list: {
          type: Array,
          notify: true
        }

      },

      /**
       * Actually a factory method, not a true constructor. Only runs if
       * someone invokes it directly (via `new Polymer.IronMeta()`);
       *
       * @param {{type: (string|undefined), key: (string|undefined)}=} config
       */
      factoryImpl: function(config) {
        if (config) {
          for (var n in config) {
            switch(n) {
              case 'type':
              case 'key':
                this[n] = config[n];
                break;
            }
          }
        }
      },

      created: function() {
        // TODO(sjmiles): good for debugging?
        this._metaDatas = metaDatas;
        this._metaArrays = metaArrays;
      },

      _keyChanged: function(key) {
        this._setValue(this._metaData && this._metaData[key]);
      },

      _typeChanged: function(type) {
        this._metaData = metaDatas[type];
        this.list = metaArrays[type];
        if (this.key) {
          this._keyChanged(this.key);
        }
      },

      /**
       * Retrieves meta data value by key.
       * @param {string} key The key of the meta-data to be returned.
       * @return {*}
       */
      byKey: function(key) {
        return this._metaData && this._metaData[key];
      }

    });

  })();
Polymer({

      is: 'iron-icon',

      properties: {

        /**
         * The name of the icon to use. The name should be of the form:
         * `iconset_name:icon_name`.
         */
        icon: {
          type: String
        },

        /**
         * The name of the theme to used, if one is specified by the
         * iconset.
         */
        theme: {
          type: String
        },

        /**
         * If using iron-icon without an iconset, you can set the src to be
         * the URL of an individual icon image file. Note that this will take
         * precedence over a given icon attribute.
         */
        src: {
          type: String
        },

        /**
         * @type {!Polymer.IronMeta}
         */
        _meta: {
          value: Polymer.Base.create('iron-meta', {type: 'iconset'})
        }

      },

      observers: [
        '_updateIcon(_meta, isAttached)',
        '_updateIcon(theme, isAttached)',
        '_srcChanged(src, isAttached)',
        '_iconChanged(icon, isAttached)'
      ],

      _DEFAULT_ICONSET: 'icons',

      _iconChanged: function(icon) {
        var parts = (icon || '').split(':');
        this._iconName = parts.pop();
        this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
        this._updateIcon();
      },

      _srcChanged: function(src) {
        this._updateIcon();
      },

      _usesIconset: function() {
        return this.icon || !this.src;
      },

      /** @suppress {visibility} */
      _updateIcon: function() {
        if (this._usesIconset()) {
          if (this._img && this._img.parentNode) {
            Polymer.dom(this.root).removeChild(this._img);
          }
          if (this._iconName === "") {
            if (this._iconset) {
              this._iconset.removeIcon(this);
            }
          } else if (this._iconsetName && this._meta) {
            this._iconset = /** @type {?Polymer.Iconset} */ (
              this._meta.byKey(this._iconsetName));
            if (this._iconset) {
              this._iconset.applyIcon(this, this._iconName, this.theme);
              this.unlisten(window, 'iron-iconset-added', '_updateIcon');
            } else {
              this.listen(window, 'iron-iconset-added', '_updateIcon');
            }
          }
        } else {
          if (this._iconset) {
            this._iconset.removeIcon(this);
          }
          if (!this._img) {
            this._img = document.createElement('img');
            this._img.style.width = '100%';
            this._img.style.height = '100%';
            this._img.draggable = false;
          }
          this._img.src = this.src;
          Polymer.dom(this.root).appendChild(this._img);
        }
      }

    });
(function() {
    'use strict';

    /**
     * Chrome uses an older version of DOM Level 3 Keyboard Events
     *
     * Most keys are labeled as text, but some are Unicode codepoints.
     * Values taken from: http://www.w3.org/TR/2007/WD-DOM-Level-3-Events-20071221/keyset.html#KeySet-Set
     */
    var KEY_IDENTIFIER = {
      'U+0008': 'backspace',
      'U+0009': 'tab',
      'U+001B': 'esc',
      'U+0020': 'space',
      'U+007F': 'del'
    };

    /**
     * Special table for KeyboardEvent.keyCode.
     * KeyboardEvent.keyIdentifier is better, and KeyBoardEvent.key is even better
     * than that.
     *
     * Values from: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.keyCode#Value_of_keyCode
     */
    var KEY_CODE = {
      8: 'backspace',
      9: 'tab',
      13: 'enter',
      27: 'esc',
      33: 'pageup',
      34: 'pagedown',
      35: 'end',
      36: 'home',
      32: 'space',
      37: 'left',
      38: 'up',
      39: 'right',
      40: 'down',
      46: 'del',
      106: '*'
    };

    /**
     * MODIFIER_KEYS maps the short name for modifier keys used in a key
     * combo string to the property name that references those same keys
     * in a KeyboardEvent instance.
     */
    var MODIFIER_KEYS = {
      'shift': 'shiftKey',
      'ctrl': 'ctrlKey',
      'alt': 'altKey',
      'meta': 'metaKey'
    };

    /**
     * KeyboardEvent.key is mostly represented by printable character made by
     * the keyboard, with unprintable keys labeled nicely.
     *
     * However, on OS X, Alt+char can make a Unicode character that follows an
     * Apple-specific mapping. In this case, we fall back to .keyCode.
     */
    var KEY_CHAR = /[a-z0-9*]/;

    /**
     * Matches a keyIdentifier string.
     */
    var IDENT_CHAR = /U\+/;

    /**
     * Matches arrow keys in Gecko 27.0+
     */
    var ARROW_KEY = /^arrow/;

    /**
     * Matches space keys everywhere (notably including IE10's exceptional name
     * `spacebar`).
     */
    var SPACE_KEY = /^space(bar)?/;

    /**
     * Matches ESC key.
     *
     * Value from: http://w3c.github.io/uievents-key/#key-Escape
     */
    var ESC_KEY = /^escape$/;

    /**
     * Transforms the key.
     * @param {string} key The KeyBoardEvent.key
     * @param {Boolean} [noSpecialChars] Limits the transformation to
     * alpha-numeric characters.
     */
    function transformKey(key, noSpecialChars) {
      var validKey = '';
      if (key) {
        var lKey = key.toLowerCase();
        if (lKey === ' ' || SPACE_KEY.test(lKey)) {
          validKey = 'space';
        } else if (ESC_KEY.test(lKey)) {
          validKey = 'esc';
        } else if (lKey.length == 1) {
          if (!noSpecialChars || KEY_CHAR.test(lKey)) {
            validKey = lKey;
          }
        } else if (ARROW_KEY.test(lKey)) {
          validKey = lKey.replace('arrow', '');
        } else if (lKey == 'multiply') {
          // numpad '*' can map to Multiply on IE/Windows
          validKey = '*';
        } else {
          validKey = lKey;
        }
      }
      return validKey;
    }

    function transformKeyIdentifier(keyIdent) {
      var validKey = '';
      if (keyIdent) {
        if (keyIdent in KEY_IDENTIFIER) {
          validKey = KEY_IDENTIFIER[keyIdent];
        } else if (IDENT_CHAR.test(keyIdent)) {
          keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
          validKey = String.fromCharCode(keyIdent).toLowerCase();
        } else {
          validKey = keyIdent.toLowerCase();
        }
      }
      return validKey;
    }

    function transformKeyCode(keyCode) {
      var validKey = '';
      if (Number(keyCode)) {
        if (keyCode >= 65 && keyCode <= 90) {
          // ascii a-z
          // lowercase is 32 offset from uppercase
          validKey = String.fromCharCode(32 + keyCode);
        } else if (keyCode >= 112 && keyCode <= 123) {
          // function keys f1-f12
          validKey = 'f' + (keyCode - 112);
        } else if (keyCode >= 48 && keyCode <= 57) {
          // top 0-9 keys
          validKey = String(keyCode - 48);
        } else if (keyCode >= 96 && keyCode <= 105) {
          // num pad 0-9
          validKey = String(keyCode - 96);
        } else {
          validKey = KEY_CODE[keyCode];
        }
      }
      return validKey;
    }

    /**
      * Calculates the normalized key for a KeyboardEvent.
      * @param {KeyboardEvent} keyEvent
      * @param {Boolean} [noSpecialChars] Set to true to limit keyEvent.key
      * transformation to alpha-numeric chars. This is useful with key
      * combinations like shift + 2, which on FF for MacOS produces
      * keyEvent.key = @
      * To get 2 returned, set noSpecialChars = true
      * To get @ returned, set noSpecialChars = false
     */
    function normalizedKeyForEvent(keyEvent, noSpecialChars) {
      // Fall back from .key, to .detail.key for artifical keyboard events,
      // and then to deprecated .keyIdentifier and .keyCode.
      if (keyEvent.key) {
        return transformKey(keyEvent.key, noSpecialChars);
      }
      if (keyEvent.detail && keyEvent.detail.key) {
        return transformKey(keyEvent.detail.key, noSpecialChars);
      }
      return transformKeyIdentifier(keyEvent.keyIdentifier) ||
        transformKeyCode(keyEvent.keyCode) || '';
    }

    function keyComboMatchesEvent(keyCombo, event) {
      // For combos with modifiers we support only alpha-numeric keys
      var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
      return keyEvent === keyCombo.key &&
        (!keyCombo.hasModifiers || (
          !!event.shiftKey === !!keyCombo.shiftKey &&
          !!event.ctrlKey === !!keyCombo.ctrlKey &&
          !!event.altKey === !!keyCombo.altKey &&
          !!event.metaKey === !!keyCombo.metaKey)
        );
    }

    function parseKeyComboString(keyComboString) {
      if (keyComboString.length === 1) {
        return {
          combo: keyComboString,
          key: keyComboString,
          event: 'keydown'
        };
      }
      return keyComboString.split('+').reduce(function(parsedKeyCombo, keyComboPart) {
        var eventParts = keyComboPart.split(':');
        var keyName = eventParts[0];
        var event = eventParts[1];

        if (keyName in MODIFIER_KEYS) {
          parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
          parsedKeyCombo.hasModifiers = true;
        } else {
          parsedKeyCombo.key = keyName;
          parsedKeyCombo.event = event || 'keydown';
        }

        return parsedKeyCombo;
      }, {
        combo: keyComboString.split(':').shift()
      });
    }

    function parseEventString(eventString) {
      return eventString.trim().split(' ').map(function(keyComboString) {
        return parseKeyComboString(keyComboString);
      });
    }

    /**
     * `Polymer.IronA11yKeysBehavior` provides a normalized interface for processing
     * keyboard commands that pertain to [WAI-ARIA best practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding).
     * The element takes care of browser differences with respect to Keyboard events
     * and uses an expressive syntax to filter key presses.
     *
     * Use the `keyBindings` prototype property to express what combination of keys
     * will trigger the callback. A key binding has the format
     * `"KEY+MODIFIER:EVENT": "callback"` (`"KEY": "callback"` or
     * `"KEY:EVENT": "callback"` are valid as well). Some examples:
     *
     *      keyBindings: {
     *        'space': '_onKeydown', // same as 'space:keydown'
     *        'shift+tab': '_onKeydown',
     *        'enter:keypress': '_onKeypress',
     *        'esc:keyup': '_onKeyup'
     *      }
     *
     * The callback will receive with an event containing the following information in `event.detail`:
     *
     *      _onKeydown: function(event) {
     *        console.log(event.detail.combo); // KEY+MODIFIER, e.g. "shift+tab"
     *        console.log(event.detail.key); // KEY only, e.g. "tab"
     *        console.log(event.detail.event); // EVENT, e.g. "keydown"
     *        console.log(event.detail.keyboardEvent); // the original KeyboardEvent
     *      }
     *
     * Use the `keyEventTarget` attribute to set up event handlers on a specific
     * node.
     *
     * See the [demo source code](https://github.com/PolymerElements/iron-a11y-keys-behavior/blob/master/demo/x-key-aware.html)
     * for an example.
     *
     * @demo demo/index.html
     * @polymerBehavior
     */
    Polymer.IronA11yKeysBehavior = {
      properties: {
        /**
         * The EventTarget that will be firing relevant KeyboardEvents. Set it to
         * `null` to disable the listeners.
         * @type {?EventTarget}
         */
        keyEventTarget: {
          type: Object,
          value: function() {
            return this;
          }
        },

        /**
         * If true, this property will cause the implementing element to
         * automatically stop propagation on any handled KeyboardEvents.
         */
        stopKeyboardEventPropagation: {
          type: Boolean,
          value: false
        },

        _boundKeyHandlers: {
          type: Array,
          value: function() {
            return [];
          }
        },

        // We use this due to a limitation in IE10 where instances will have
        // own properties of everything on the "prototype".
        _imperativeKeyBindings: {
          type: Object,
          value: function() {
            return {};
          }
        }
      },

      observers: [
        '_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'
      ],


      /**
       * To be used to express what combination of keys  will trigger the relative
       * callback. e.g. `keyBindings: { 'esc': '_onEscPressed'}`
       * @type {!Object}
       */
      keyBindings: {},

      registered: function() {
        this._prepKeyBindings();
      },

      attached: function() {
        this._listenKeyEventListeners();
      },

      detached: function() {
        this._unlistenKeyEventListeners();
      },

      /**
       * Can be used to imperatively add a key binding to the implementing
       * element. This is the imperative equivalent of declaring a keybinding
       * in the `keyBindings` prototype property.
       */
      addOwnKeyBinding: function(eventString, handlerName) {
        this._imperativeKeyBindings[eventString] = handlerName;
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * When called, will remove all imperatively-added key bindings.
       */
      removeOwnKeyBindings: function() {
        this._imperativeKeyBindings = {};
        this._prepKeyBindings();
        this._resetKeyEventListeners();
      },

      /**
       * Returns true if a keyboard event matches `eventString`.
       *
       * @param {KeyboardEvent} event
       * @param {string} eventString
       * @return {boolean}
       */
      keyboardEventMatchesKeys: function(event, eventString) {
        var keyCombos = parseEventString(eventString);
        for (var i = 0; i < keyCombos.length; ++i) {
          if (keyComboMatchesEvent(keyCombos[i], event)) {
            return true;
          }
        }
        return false;
      },

      _collectKeyBindings: function() {
        var keyBindings = this.behaviors.map(function(behavior) {
          return behavior.keyBindings;
        });

        if (keyBindings.indexOf(this.keyBindings) === -1) {
          keyBindings.push(this.keyBindings);
        }

        return keyBindings;
      },

      _prepKeyBindings: function() {
        this._keyBindings = {};

        this._collectKeyBindings().forEach(function(keyBindings) {
          for (var eventString in keyBindings) {
            this._addKeyBinding(eventString, keyBindings[eventString]);
          }
        }, this);

        for (var eventString in this._imperativeKeyBindings) {
          this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
        }

        // Give precedence to combos with modifiers to be checked first.
        for (var eventName in this._keyBindings) {
          this._keyBindings[eventName].sort(function (kb1, kb2) {
            var b1 = kb1[0].hasModifiers;
            var b2 = kb2[0].hasModifiers;
            return (b1 === b2) ? 0 : b1 ? -1 : 1;
          })
        }
      },

      _addKeyBinding: function(eventString, handlerName) {
        parseEventString(eventString).forEach(function(keyCombo) {
          this._keyBindings[keyCombo.event] =
            this._keyBindings[keyCombo.event] || [];

          this._keyBindings[keyCombo.event].push([
            keyCombo,
            handlerName
          ]);
        }, this);
      },

      _resetKeyEventListeners: function() {
        this._unlistenKeyEventListeners();

        if (this.isAttached) {
          this._listenKeyEventListeners();
        }
      },

      _listenKeyEventListeners: function() {
        if (!this.keyEventTarget) {
          return;
        }
        Object.keys(this._keyBindings).forEach(function(eventName) {
          var keyBindings = this._keyBindings[eventName];
          var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);

          this._boundKeyHandlers.push([this.keyEventTarget, eventName, boundKeyHandler]);

          this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
        }, this);
      },

      _unlistenKeyEventListeners: function() {
        var keyHandlerTuple;
        var keyEventTarget;
        var eventName;
        var boundKeyHandler;

        while (this._boundKeyHandlers.length) {
          // My kingdom for block-scope binding and destructuring assignment..
          keyHandlerTuple = this._boundKeyHandlers.pop();
          keyEventTarget = keyHandlerTuple[0];
          eventName = keyHandlerTuple[1];
          boundKeyHandler = keyHandlerTuple[2];

          keyEventTarget.removeEventListener(eventName, boundKeyHandler);
        }
      },

      _onKeyBindingEvent: function(keyBindings, event) {
        if (this.stopKeyboardEventPropagation) {
          event.stopPropagation();
        }

        // if event has been already prevented, don't do anything
        if (event.defaultPrevented) {
          return;
        }

        for (var i = 0; i < keyBindings.length; i++) {
          var keyCombo = keyBindings[i][0];
          var handlerName = keyBindings[i][1];
          if (keyComboMatchesEvent(keyCombo, event)) {
            this._triggerKeyHandler(keyCombo, handlerName, event);
            // exit the loop if eventDefault was prevented
            if (event.defaultPrevented) {
              return;
            }
          }
        }
      },

      _triggerKeyHandler: function(keyCombo, handlerName, keyboardEvent) {
        var detail = Object.create(keyCombo);
        detail.keyboardEvent = keyboardEvent;
        var event = new CustomEvent(keyCombo.event, {
          detail: detail,
          cancelable: true
        });
        this[handlerName].call(this, event);
        if (event.defaultPrevented) {
          keyboardEvent.preventDefault();
        }
      }
    };
  })();
/**
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronControlState = {

    properties: {

      /**
       * If true, the element currently has focus.
       */
      focused: {
        type: Boolean,
        value: false,
        notify: true,
        readOnly: true,
        reflectToAttribute: true
      },

      /**
       * If true, the user cannot interact with this element.
       */
      disabled: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_disabledChanged',
        reflectToAttribute: true
      },

      _oldTabIndex: {
        type: Number
      },

      _boundFocusBlurHandler: {
        type: Function,
        value: function() {
          return this._focusBlurHandler.bind(this);
        }
      }

    },

    observers: [
      '_changedControlState(focused, disabled)'
    ],

    ready: function() {
      this.addEventListener('focus', this._boundFocusBlurHandler, true);
      this.addEventListener('blur', this._boundFocusBlurHandler, true);
    },

    _focusBlurHandler: function(event) {
      // NOTE(cdata):  if we are in ShadowDOM land, `event.target` will
      // eventually become `this` due to retargeting; if we are not in
      // ShadowDOM land, `event.target` will eventually become `this` due
      // to the second conditional which fires a synthetic event (that is also
      // handled). In either case, we can disregard `event.path`.

      if (event.target === this) {
        this._setFocused(event.type === 'focus');
      } else if (!this.shadowRoot) {
        var target = /** @type {Node} */(Polymer.dom(event).localTarget);
        if (!this.isLightDescendant(target)) {
          this.fire(event.type, {sourceEvent: event}, {
            node: this,
            bubbles: event.bubbles,
            cancelable: event.cancelable
          });
        }
      }
    },

    _disabledChanged: function(disabled, old) {
      this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      this.style.pointerEvents = disabled ? 'none' : '';
      if (disabled) {
        this._oldTabIndex = this.tabIndex;
        this._setFocused(false);
        this.tabIndex = -1;
        this.blur();
      } else if (this._oldTabIndex !== undefined) {
        this.tabIndex = this._oldTabIndex;
      }
    },

    _changedControlState: function() {
      // _controlStateChanged is abstract, follow-on behaviors may implement it
      if (this._controlStateChanged) {
        this._controlStateChanged();
      }
    }

  };
/**
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronButtonState
   */
  Polymer.IronButtonStateImpl = {

    properties: {

      /**
       * If true, the user is currently holding down the button.
       */
      pressed: {
        type: Boolean,
        readOnly: true,
        value: false,
        reflectToAttribute: true,
        observer: '_pressedChanged'
      },

      /**
       * If true, the button toggles the active state with each tap or press
       * of the spacebar.
       */
      toggles: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      /**
       * If true, the button is a toggle and is currently in the active state.
       */
      active: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },

      /**
       * True if the element is currently being pressed by a "pointer," which
       * is loosely defined as mouse or touch input (but specifically excluding
       * keyboard input).
       */
      pointerDown: {
        type: Boolean,
        readOnly: true,
        value: false
      },

      /**
       * True if the input device that caused the element to receive focus
       * was a keyboard.
       */
      receivedFocusFromKeyboard: {
        type: Boolean,
        readOnly: true
      },

      /**
       * The aria attribute to be set if the button is a toggle and in the
       * active state.
       */
      ariaActiveAttribute: {
        type: String,
        value: 'aria-pressed',
        observer: '_ariaActiveAttributeChanged'
      }
    },

    listeners: {
      down: '_downHandler',
      up: '_upHandler',
      tap: '_tapHandler'
    },

    observers: [
      '_detectKeyboardFocus(focused)',
      '_activeChanged(active, ariaActiveAttribute)'
    ],

    keyBindings: {
      'enter:keydown': '_asyncClick',
      'space:keydown': '_spaceKeyDownHandler',
      'space:keyup': '_spaceKeyUpHandler',
    },

    _mouseEventRe: /^mouse/,

    _tapHandler: function() {
      if (this.toggles) {
       // a tap is needed to toggle the active state
        this._userActivate(!this.active);
      } else {
        this.active = false;
      }
    },

    _detectKeyboardFocus: function(focused) {
      this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
    },

    // to emulate native checkbox, (de-)activations from a user interaction fire
    // 'change' events
    _userActivate: function(active) {
      if (this.active !== active) {
        this.active = active;
        this.fire('change');
      }
    },

    _downHandler: function(event) {
      this._setPointerDown(true);
      this._setPressed(true);
      this._setReceivedFocusFromKeyboard(false);
    },

    _upHandler: function() {
      this._setPointerDown(false);
      this._setPressed(false);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.isLightDescendant(/** @type {Node} */(target)))
        return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopImmediatePropagation();
      this._setPressed(true);
    },

    /**
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      var keyboardEvent = event.detail.keyboardEvent;
      var target = Polymer.dom(keyboardEvent).localTarget;

      // Ignore the event if this is coming from a focused light child, since that
      // element will deal with it.
      if (this.isLightDescendant(/** @type {Node} */(target)))
        return;

      if (this.pressed) {
        this._asyncClick();
      }
      this._setPressed(false);
    },

    // trigger click asynchronously, the asynchrony is useful to allow one
    // event handler to unwind before triggering another event
    _asyncClick: function() {
      this.async(function() {
        this.click();
      }, 1);
    },

    // any of these changes are considered a change to button state

    _pressedChanged: function(pressed) {
      this._changedButtonState();
    },

    _ariaActiveAttributeChanged: function(value, oldValue) {
      if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
        this.removeAttribute(oldValue);
      }
    },

    _activeChanged: function(active, ariaActiveAttribute) {
      if (this.toggles) {
        this.setAttribute(this.ariaActiveAttribute,
                          active ? 'true' : 'false');
      } else {
        this.removeAttribute(this.ariaActiveAttribute);
      }
      this._changedButtonState();
    },

    _controlStateChanged: function() {
      if (this.disabled) {
        this._setPressed(false);
      } else {
        this._changedButtonState();
      }
    },

    // provide hook for follow-on behaviors to react to button-state

    _changedButtonState: function() {
      if (this._buttonStateChanged) {
        this._buttonStateChanged(); // abstract
      }
    }

  };

  /** @polymerBehavior */
  Polymer.IronButtonState = [
    Polymer.IronA11yKeysBehavior,
    Polymer.IronButtonStateImpl
  ];
(function() {
    var Utility = {
      distance: function(x1, y1, x2, y2) {
        var xDelta = (x1 - x2);
        var yDelta = (y1 - y2);

        return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
      },

      now: window.performance && window.performance.now ?
          window.performance.now.bind(window.performance) : Date.now
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function ElementMetrics(element) {
      this.element = element;
      this.width = this.boundingRect.width;
      this.height = this.boundingRect.height;

      this.size = Math.max(this.width, this.height);
    }

    ElementMetrics.prototype = {
      get boundingRect () {
        return this.element.getBoundingClientRect();
      },

      furthestCornerDistanceFrom: function(x, y) {
        var topLeft = Utility.distance(x, y, 0, 0);
        var topRight = Utility.distance(x, y, this.width, 0);
        var bottomLeft = Utility.distance(x, y, 0, this.height);
        var bottomRight = Utility.distance(x, y, this.width, this.height);

        return Math.max(topLeft, topRight, bottomLeft, bottomRight);
      }
    };

    /**
     * @param {HTMLElement} element
     * @constructor
     */
    function Ripple(element) {
      this.element = element;
      this.color = window.getComputedStyle(element).color;

      this.wave = document.createElement('div');
      this.waveContainer = document.createElement('div');
      this.wave.style.backgroundColor = this.color;
      this.wave.classList.add('wave');
      this.waveContainer.classList.add('wave-container');
      Polymer.dom(this.waveContainer).appendChild(this.wave);

      this.resetInteractionState();
    }

    Ripple.MAX_RADIUS = 300;

    Ripple.prototype = {
      get recenters() {
        return this.element.recenters;
      },

      get center() {
        return this.element.center;
      },

      get mouseDownElapsed() {
        var elapsed;

        if (!this.mouseDownStart) {
          return 0;
        }

        elapsed = Utility.now() - this.mouseDownStart;

        if (this.mouseUpStart) {
          elapsed -= this.mouseUpElapsed;
        }

        return elapsed;
      },

      get mouseUpElapsed() {
        return this.mouseUpStart ?
          Utility.now () - this.mouseUpStart : 0;
      },

      get mouseDownElapsedSeconds() {
        return this.mouseDownElapsed / 1000;
      },

      get mouseUpElapsedSeconds() {
        return this.mouseUpElapsed / 1000;
      },

      get mouseInteractionSeconds() {
        return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
      },

      get initialOpacity() {
        return this.element.initialOpacity;
      },

      get opacityDecayVelocity() {
        return this.element.opacityDecayVelocity;
      },

      get radius() {
        var width2 = this.containerMetrics.width * this.containerMetrics.width;
        var height2 = this.containerMetrics.height * this.containerMetrics.height;
        var waveRadius = Math.min(
          Math.sqrt(width2 + height2),
          Ripple.MAX_RADIUS
        ) * 1.1 + 5;

        var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
        var timeNow = this.mouseInteractionSeconds / duration;
        var size = waveRadius * (1 - Math.pow(80, -timeNow));

        return Math.abs(size);
      },

      get opacity() {
        if (!this.mouseUpStart) {
          return this.initialOpacity;
        }

        return Math.max(
          0,
          this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity
        );
      },

      get outerOpacity() {
        // Linear increase in background opacity, capped at the opacity
        // of the wavefront (waveOpacity).
        var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
        var waveOpacity = this.opacity;

        return Math.max(
          0,
          Math.min(outerOpacity, waveOpacity)
        );
      },

      get isOpacityFullyDecayed() {
        return this.opacity < 0.01 &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isRestingAtMaxRadius() {
        return this.opacity >= this.initialOpacity &&
          this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
      },

      get isAnimationComplete() {
        return this.mouseUpStart ?
          this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
      },

      get translationFraction() {
        return Math.min(
          1,
          this.radius / this.containerMetrics.size * 2 / Math.sqrt(2)
        );
      },

      get xNow() {
        if (this.xEnd) {
          return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
        }

        return this.xStart;
      },

      get yNow() {
        if (this.yEnd) {
          return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
        }

        return this.yStart;
      },

      get isMouseDown() {
        return this.mouseDownStart && !this.mouseUpStart;
      },

      resetInteractionState: function() {
        this.maxRadius = 0;
        this.mouseDownStart = 0;
        this.mouseUpStart = 0;

        this.xStart = 0;
        this.yStart = 0;
        this.xEnd = 0;
        this.yEnd = 0;
        this.slideDistance = 0;

        this.containerMetrics = new ElementMetrics(this.element);
      },

      draw: function() {
        var scale;
        var translateString;
        var dx;
        var dy;

        this.wave.style.opacity = this.opacity;

        scale = this.radius / (this.containerMetrics.size / 2);
        dx = this.xNow - (this.containerMetrics.width / 2);
        dy = this.yNow - (this.containerMetrics.height / 2);


        // 2d transform for safari because of border-radius and overflow:hidden clipping bug.
        // https://bugs.webkit.org/show_bug.cgi?id=98538
        this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
        this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
        this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
        this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
      },

      /** @param {Event=} event */
      downAction: function(event) {
        var xCenter = this.containerMetrics.width / 2;
        var yCenter = this.containerMetrics.height / 2;

        this.resetInteractionState();
        this.mouseDownStart = Utility.now();

        if (this.center) {
          this.xStart = xCenter;
          this.yStart = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        } else {
          this.xStart = event ?
              event.detail.x - this.containerMetrics.boundingRect.left :
              this.containerMetrics.width / 2;
          this.yStart = event ?
              event.detail.y - this.containerMetrics.boundingRect.top :
              this.containerMetrics.height / 2;
        }

        if (this.recenters) {
          this.xEnd = xCenter;
          this.yEnd = yCenter;
          this.slideDistance = Utility.distance(
            this.xStart, this.yStart, this.xEnd, this.yEnd
          );
        }

        this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(
          this.xStart,
          this.yStart
        );

        this.waveContainer.style.top =
          (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
        this.waveContainer.style.left =
          (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';

        this.waveContainer.style.width = this.containerMetrics.size + 'px';
        this.waveContainer.style.height = this.containerMetrics.size + 'px';
      },

      /** @param {Event=} event */
      upAction: function(event) {
        if (!this.isMouseDown) {
          return;
        }

        this.mouseUpStart = Utility.now();
      },

      remove: function() {
        Polymer.dom(this.waveContainer.parentNode).removeChild(
          this.waveContainer
        );
      }
    };

    Polymer({
      is: 'paper-ripple',

      behaviors: [
        Polymer.IronA11yKeysBehavior
      ],

      properties: {
        /**
         * The initial opacity set on the wave.
         *
         * @attribute initialOpacity
         * @type number
         * @default 0.25
         */
        initialOpacity: {
          type: Number,
          value: 0.25
        },

        /**
         * How fast (opacity per second) the wave fades out.
         *
         * @attribute opacityDecayVelocity
         * @type number
         * @default 0.8
         */
        opacityDecayVelocity: {
          type: Number,
          value: 0.8
        },

        /**
         * If true, ripples will exhibit a gravitational pull towards
         * the center of their container as they fade away.
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        recenters: {
          type: Boolean,
          value: false
        },

        /**
         * If true, ripples will center inside its container
         *
         * @attribute recenters
         * @type boolean
         * @default false
         */
        center: {
          type: Boolean,
          value: false
        },

        /**
         * A list of the visual ripples.
         *
         * @attribute ripples
         * @type Array
         * @default []
         */
        ripples: {
          type: Array,
          value: function() {
            return [];
          }
        },

        /**
         * True when there are visible ripples animating within the
         * element.
         */
        animating: {
          type: Boolean,
          readOnly: true,
          reflectToAttribute: true,
          value: false
        },

        /**
         * If true, the ripple will remain in the "down" state until `holdDown`
         * is set to false again.
         */
        holdDown: {
          type: Boolean,
          value: false,
          observer: '_holdDownChanged'
        },

        /**
         * If true, the ripple will not generate a ripple effect
         * via pointer interaction.
         * Calling ripple's imperative api like `simulatedRipple` will
         * still generate the ripple effect.
         */
        noink: {
          type: Boolean,
          value: false
        },

        _animating: {
          type: Boolean
        },

        _boundAnimate: {
          type: Function,
          value: function() {
            return this.animate.bind(this);
          }
        }
      },

      get target () {
        return this.keyEventTarget;
      },

      keyBindings: {
        'enter:keydown': '_onEnterKeydown',
        'space:keydown': '_onSpaceKeydown',
        'space:keyup': '_onSpaceKeyup'
      },

      attached: function() {
        // Set up a11yKeysBehavior to listen to key events on the target,
        // so that space and enter activate the ripple even if the target doesn't
        // handle key events. The key handlers deal with `noink` themselves.
        if (this.parentNode.nodeType == 11) { // DOCUMENT_FRAGMENT_NODE
          this.keyEventTarget = Polymer.dom(this).getOwnerRoot().host;
        } else {
          this.keyEventTarget = this.parentNode;
        }
        var keyEventTarget = /** @type {!EventTarget} */ (this.keyEventTarget);
        this.listen(keyEventTarget, 'up', 'uiUpAction');
        this.listen(keyEventTarget, 'down', 'uiDownAction');
      },

      detached: function() {
        this.unlisten(this.keyEventTarget, 'up', 'uiUpAction');
        this.unlisten(this.keyEventTarget, 'down', 'uiDownAction');
        this.keyEventTarget = null;
      },

      get shouldKeepAnimating () {
        for (var index = 0; index < this.ripples.length; ++index) {
          if (!this.ripples[index].isAnimationComplete) {
            return true;
          }
        }

        return false;
      },

      simulatedRipple: function() {
        this.downAction(null);

        // Please see polymer/polymer#1305
        this.async(function() {
          this.upAction();
        }, 1);
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiDownAction: function(event) {
        if (!this.noink) {
          this.downAction(event);
        }
      },

      /**
       * Provokes a ripple down effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      downAction: function(event) {
        if (this.holdDown && this.ripples.length > 0) {
          return;
        }

        var ripple = this.addRipple();

        ripple.downAction(event);

        if (!this._animating) {
          this._animating = true;
          this.animate();
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * respecting the `noink` property.
       * @param {Event=} event
       */
      uiUpAction: function(event) {
        if (!this.noink) {
          this.upAction(event);
        }
      },

      /**
       * Provokes a ripple up effect via a UI event,
       * *not* respecting the `noink` property.
       * @param {Event=} event
       */
      upAction: function(event) {
        if (this.holdDown) {
          return;
        }

        this.ripples.forEach(function(ripple) {
          ripple.upAction(event);
        });

        this._animating = true;
        this.animate();
      },

      onAnimationComplete: function() {
        this._animating = false;
        this.$.background.style.backgroundColor = null;
        this.fire('transitionend');
      },

      addRipple: function() {
        var ripple = new Ripple(this);

        Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
        this.$.background.style.backgroundColor = ripple.color;
        this.ripples.push(ripple);

        this._setAnimating(true);

        return ripple;
      },

      removeRipple: function(ripple) {
        var rippleIndex = this.ripples.indexOf(ripple);

        if (rippleIndex < 0) {
          return;
        }

        this.ripples.splice(rippleIndex, 1);

        ripple.remove();

        if (!this.ripples.length) {
          this._setAnimating(false);
        }
      },

      /**
       * This conflicts with Element#antimate().
       * https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
       * @suppress {checkTypes}
       */
      animate: function() {
        if (!this._animating) {
          return;
        }
        var index;
        var ripple;

        for (index = 0; index < this.ripples.length; ++index) {
          ripple = this.ripples[index];

          ripple.draw();

          this.$.background.style.opacity = ripple.outerOpacity;

          if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
            this.removeRipple(ripple);
          }
        }

        if (!this.shouldKeepAnimating && this.ripples.length === 0) {
          this.onAnimationComplete();
        } else {
          window.requestAnimationFrame(this._boundAnimate);
        }
      },

      _onEnterKeydown: function() {
        this.uiDownAction();
        this.async(this.uiUpAction, 1);
      },

      _onSpaceKeydown: function() {
        this.uiDownAction();
      },

      _onSpaceKeyup: function() {
        this.uiUpAction();
      },

      // note: holdDown does not respect noink since it can be a focus based
      // effect.
      _holdDownChanged: function(newVal, oldVal) {
        if (oldVal === undefined) {
          return;
        }
        if (newVal) {
          this.downAction();
        } else {
          this.upAction();
        }
      }

      /**
      Fired when the animation finishes.
      This is useful if you want to wait until
      the ripple animation finishes to perform some action.

      @event transitionend
      @param {{node: Object}} detail Contains the animated node.
      */
    });
  })();
/**
   * `Polymer.PaperRippleBehavior` dynamically implements a ripple
   * when the element has focus via pointer or keyboard.
   *
   * NOTE: This behavior is intended to be used in conjunction with and after
   * `Polymer.IronButtonState` and `Polymer.IronControlState`.
   *
   * @polymerBehavior Polymer.PaperRippleBehavior
   */
  Polymer.PaperRippleBehavior = {
    properties: {
      /**
       * If true, the element will not produce a ripple effect when interacted
       * with via the pointer.
       */
      noink: {
        type: Boolean,
        observer: '_noinkChanged'
      },

      /**
       * @type {Element|undefined}
       */
      _rippleContainer: {
        type: Object,
      }
    },

    /**
     * Ensures a `<paper-ripple>` element is available when the element is
     * focused.
     */
    _buttonStateChanged: function() {
      if (this.focused) {
        this.ensureRipple();
      }
    },

    /**
     * In addition to the functionality provided in `IronButtonState`, ensures
     * a ripple effect is created when the element is in a `pressed` state.
     */
    _downHandler: function(event) {
      Polymer.IronButtonStateImpl._downHandler.call(this, event);
      if (this.pressed) {
        this.ensureRipple(event);
      }
    },

    /**
     * Ensures this element contains a ripple effect. For startup efficiency
     * the ripple effect is dynamically on demand when needed.
     * @param {!Event=} optTriggeringEvent (optional) event that triggered the
     * ripple.
     */
    ensureRipple: function(optTriggeringEvent) {
      if (!this.hasRipple()) {
        this._ripple = this._createRipple();
        this._ripple.noink = this.noink;
        var rippleContainer = this._rippleContainer || this.root;
        if (rippleContainer) {
          Polymer.dom(rippleContainer).appendChild(this._ripple);
        }
        if (optTriggeringEvent) {
          // Check if the event happened inside of the ripple container
          // Fall back to host instead of the root because distributed text
          // nodes are not valid event targets
          var domContainer = Polymer.dom(this._rippleContainer || this);
          var target = Polymer.dom(optTriggeringEvent).rootTarget;
          if (domContainer.deepContains( /** @type {Node} */(target))) {
            this._ripple.uiDownAction(optTriggeringEvent);
          }
        }
      }
    },

    /**
     * Returns the `<paper-ripple>` element used by this element to create
     * ripple effects. The element's ripple is created on demand, when
     * necessary, and calling this method will force the
     * ripple to be created.
     */
    getRipple: function() {
      this.ensureRipple();
      return this._ripple;
    },

    /**
     * Returns true if this element currently contains a ripple effect.
     * @return {boolean}
     */
    hasRipple: function() {
      return Boolean(this._ripple);
    },

    /**
     * Create the element's ripple effect via creating a `<paper-ripple>`.
     * Override this method to customize the ripple element.
     * @return {!PaperRippleElement} Returns a `<paper-ripple>` element.
     */
    _createRipple: function() {
      return /** @type {!PaperRippleElement} */ (
          document.createElement('paper-ripple'));
    },

    _noinkChanged: function(noink) {
      if (this.hasRipple()) {
        this._ripple.noink = noink;
      }
    }
  };
/**
   * `Polymer.PaperInkyFocusBehavior` implements a ripple when the element has keyboard focus.
   *
   * @polymerBehavior Polymer.PaperInkyFocusBehavior
   */
  Polymer.PaperInkyFocusBehaviorImpl = {
    observers: [
      '_focusedChanged(receivedFocusFromKeyboard)'
    ],

    _focusedChanged: function(receivedFocusFromKeyboard) {
      if (receivedFocusFromKeyboard) {
        this.ensureRipple();
      }
      if (this.hasRipple()) {
        this._ripple.holdDown = receivedFocusFromKeyboard;
      }
    },

    _createRipple: function() {
      var ripple = Polymer.PaperRippleBehavior._createRipple();
      ripple.id = 'ink';
      ripple.setAttribute('center', '');
      ripple.classList.add('circle');
      return ripple;
    }
  };

  /** @polymerBehavior Polymer.PaperInkyFocusBehavior */
  Polymer.PaperInkyFocusBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperInkyFocusBehaviorImpl
  ];
Polymer({
      is: 'paper-icon-button',

      hostAttributes: {
        role: 'button',
        tabindex: '0'
      },

      behaviors: [
        Polymer.PaperInkyFocusBehavior
      ],

      properties: {
        /**
         * The URL of an image for the icon. If the src property is specified,
         * the icon property should not be.
         */
        src: {
          type: String
        },

        /**
         * Specifies the icon name or index in the set of icons available in
         * the icon's icon set. If the icon property is specified,
         * the src property should not be.
         */
        icon: {
          type: String
        },

        /**
         * Specifies the alternate text for the button, for accessibility.
         */
        alt: {
          type: String,
          observer: "_altChanged"
        }
      },

      _altChanged: function(newValue, oldValue) {
        var label = this.getAttribute('aria-label');

        // Don't stomp over a user-set aria-label.
        if (!label || oldValue == label) {
          this.setAttribute('aria-label', newValue);
        }
      }
    });
/**
   * The `iron-iconset-svg` element allows users to define their own icon sets
   * that contain svg icons. The svg icon elements should be children of the
   * `iron-iconset-svg` element. Multiple icons should be given distinct id's.
   *
   * Using svg elements to create icons has a few advantages over traditional
   * bitmap graphics like jpg or png. Icons that use svg are vector based so
   * they are resolution independent and should look good on any device. They
   * are stylable via css. Icons can be themed, colorized, and even animated.
   *
   * Example:
   *
   *     <iron-iconset-svg name="my-svg-icons" size="24">
   *       <svg>
   *         <defs>
   *           <g id="shape">
   *             <rect x="12" y="0" width="12" height="24" />
   *             <circle cx="12" cy="12" r="12" />
   *           </g>
   *         </defs>
   *       </svg>
   *     </iron-iconset-svg>
   *
   * This will automatically register the icon set "my-svg-icons" to the iconset
   * database.  To use these icons from within another element, make a
   * `iron-iconset` element and call the `byId` method
   * to retrieve a given iconset. To apply a particular icon inside an
   * element use the `applyIcon` method. For example:
   *
   *     iconset.applyIcon(iconNode, 'car');
   *
   * @element iron-iconset-svg
   * @demo demo/index.html
   * @implements {Polymer.Iconset}
   */
  Polymer({
    is: 'iron-iconset-svg',

    properties: {

      /**
       * The name of the iconset.
       */
      name: {
        type: String,
        observer: '_nameChanged'
      },

      /**
       * The size of an individual icon. Note that icons must be square.
       */
      size: {
        type: Number,
        value: 24
      },

      /**
       * Set to true to enable mirroring of icons where specified when they are
       * stamped. Icons that should be mirrored should be decorated with a
       * `mirror-in-rtl` attribute.
       *
       * NOTE: For performance reasons, direction will be resolved once per
       * document per iconset, so moving icons in and out of RTL subtrees will
       * not cause their mirrored state to change.
       */
      rtlMirroring: {
        type: Boolean,
        value: false
      }
    },

    attached: function() {
      this.style.display = 'none';
    },

    /**
     * Construct an array of all icon names in this iconset.
     *
     * @return {!Array} Array of icon names.
     */
    getIconNames: function() {
      this._icons = this._createIconMap();
      return Object.keys(this._icons).map(function(n) {
        return this.name + ':' + n;
      }, this);
    },

    /**
     * Applies an icon to the given element.
     *
     * An svg icon is prepended to the element's shadowRoot if it exists,
     * otherwise to the element itself.
     *
     * If RTL mirroring is enabled, and the icon is marked to be mirrored in
     * RTL, the element will be tested (once and only once ever for each
     * iconset) to determine the direction of the subtree the element is in.
     * This direction will apply to all future icon applications, although only
     * icons marked to be mirrored will be affected.
     *
     * @method applyIcon
     * @param {Element} element Element to which the icon is applied.
     * @param {string} iconName Name of the icon to apply.
     * @return {?Element} The svg element which renders the icon.
     */
    applyIcon: function(element, iconName) {
      // insert svg element into shadow root, if it exists
      element = element.root || element;
      // Remove old svg element
      this.removeIcon(element);
      // install new svg element
      var svg = this._cloneIcon(iconName,
          this.rtlMirroring && this._targetIsRTL(element));
      if (svg) {
        var pde = Polymer.dom(element);
        pde.insertBefore(svg, pde.childNodes[0]);
        return element._svgIcon = svg;
      }
      return null;
    },

    /**
     * Remove an icon from the given element by undoing the changes effected
     * by `applyIcon`.
     *
     * @param {Element} element The element from which the icon is removed.
     */
    removeIcon: function(element) {
      // Remove old svg element
      element = element.root || element;
      if (element._svgIcon) {
        Polymer.dom(element).removeChild(element._svgIcon);
        element._svgIcon = null;
      }
    },

    /**
     * Measures and memoizes the direction of the element. Note that this
     * measurement is only done once and the result is memoized for future
     * invocations.
     */
    _targetIsRTL: function(target) {
      if (this.__targetIsRTL == null) {
        if (target && target.nodeType !== Node.ELEMENT_NODE) {
          target = target.host;
        }

        this.__targetIsRTL = target &&
            window.getComputedStyle(target)['direction'] === 'rtl';
      }

      return this.__targetIsRTL;
    },

    /**
     *
     * When name is changed, register iconset metadata
     *
     */
    _nameChanged: function() {
      new Polymer.IronMeta({type: 'iconset', key: this.name, value: this});
      this.async(function() {
        this.fire('iron-iconset-added', this, {node: window});
      });
    },

    /**
     * Create a map of child SVG elements by id.
     *
     * @return {!Object} Map of id's to SVG elements.
     */
    _createIconMap: function() {
      // Objects chained to Object.prototype (`{}`) have members. Specifically,
      // on FF there is a `watch` method that confuses the icon map, so we
      // need to use a null-based object here.
      var icons = Object.create(null);
      Polymer.dom(this).querySelectorAll('[id]')
        .forEach(function(icon) {
          icons[icon.id] = icon;
        });
      return icons;
    },

    /**
     * Produce installable clone of the SVG element matching `id` in this
     * iconset, or `undefined` if there is no matching element.
     *
     * @return {Element} Returns an installable clone of the SVG element
     * matching `id`.
     */
    _cloneIcon: function(id, mirrorAllowed) {
      // create the icon map on-demand, since the iconset itself has no discrete
      // signal to know when it's children are fully parsed
      this._icons = this._icons || this._createIconMap();
      return this._prepareSvgClone(this._icons[id], this.size, mirrorAllowed);
    },

    /**
     * @param {Element} sourceSvg
     * @param {number} size
     * @param {Boolean} mirrorAllowed
     * @return {Element}
     */
    _prepareSvgClone: function(sourceSvg, size, mirrorAllowed) {
      if (sourceSvg) {
        var content = sourceSvg.cloneNode(true),
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
            viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size,
            cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';

        if (mirrorAllowed && content.hasAttribute('mirror-in-rtl')) {
          cssText += '-webkit-transform:scale(-1,1);transform:scale(-1,1);';
        }

        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        // TODO(dfreedm): `pointer-events: none` works around https://crbug.com/370136
        // TODO(sjmiles): inline style may not be ideal, but avoids requiring a shadow-root
        svg.style.cssText = cssText;
        svg.appendChild(content).removeAttribute('id');
        return svg;
      }
      return null;
    }

  });
if (!Object.keys) {
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString');
    var dontEnums = [
      'toString',
      'toLocaleString',
      'valueOf',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'constructor'
    ];
    var dontEnumsLength = dontEnums.length;
    return function(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }
      var result = [];
      var prop;
      var i;
      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }
      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}
/**
 * Common properties and methods for all RAML elements.
 *
 * @polymerBehavior Polymer.RamlBehavior
 */
Polymer.RamlBehavior = {
  properties: {
    // The RAML definition as JSON object. It can be obtained from RAML JS parser.
    raml: Object,
    // RAML base types
    baseTypes: {
      type: Array,
      value: function() {
        return ['object', 'array','integer', 'string','number','boolean',
          'datetime','file', 'null','any'];
      }
    }
  },
  // Trurns true if the `obj` is empty.
  isEmpty: function(obj) {
    if (!obj && typeof obj !== 'number') {
      return true;
    }
    if ((obj instanceof Array) && !obj.length) {
      return true;
    }
    if ((obj instanceof Object) && !Object.keys(obj).length) {
      return true;
    }
    return false;
  }
};
(function() {
'use strict';
var RAMLAware = {
  defaultScope: 'default',
  ramlAwares: [],
  /**
   * Store for RAML definitions.
   * @type {Object<String, Object>} The key is a scope (`default` by default)
   * and the value is the RAML definition for this scope.
   */
  raml: {},
  attachRamlAware: function(aware) {
    if (this.ramlAwares.indexOf(aware) === -1) {
      this.ramlAwares.push(aware);
      this.scopeChanged(aware);
    }
  },

  detachRamlAware: function(aware) {
    var index = this.ramlAwares.indexOf(aware);
    if (index !== -1) {
      this.ramlAwares.splice(index, 1);
    } else {
      console.warn('The aware wasn\'t attached!');
    }
  },
  /**
   * [setRaml description]
   * @param {HTMLElement} srcAware The aware that notified about the change
   */
  setRaml: function(srcAware) {
    var scope = srcAware.scope || this.defaultScope;
    var raml = srcAware.raml || undefined;
    this.raml[scope] = raml;
    this.ramlAwares.forEach((aware) => {
      if (aware === srcAware) {
        return;
      }
      let localScope = aware.scope || this.defaultScope;
      if (localScope !== scope) {
        return;
      }
      aware.raml = raml;
    });
  },

  scopeChanged: function(aware) {
    var scope = aware.scope || this.defaultScope;
    aware.raml = this.raml[scope];
  }
};

Polymer({
  is: 'raml-aware',
  properties: {
    /**
     * Scope for the RAML file.
     * Different awares may have different scope and keep different RAML objects.
     * It can be useful when one aware supports request panel and another
     * RAML import for example. In this case first one may have scope not set
     * (`default` scope) and second one `import` scope. Then both RAMLs are
     * encapsulated to the scope.
     */
    scope: String,
    // The RAML definition.
    raml: {
      type: Object,
      notify: true
    }
  },

  observers: [
    '_scopeChanged(scope)',
    '_ramlChanged(raml.*)',
  ],

  attached: function() {
    RAMLAware.attachRamlAware(this);
  },

  detached: function() {
    RAMLAware.detachRamlAware(this);
  },
  // Update RAML data for selected scope.
  _scopeChanged(scope) {
    RAMLAware.scopeChanged(this);
  },
  // Notifies other awares about RAML change.
  _ramlChanged: function() {
    RAMLAware.setRaml(this);
  }
});
})();
Polymer({
  is: 'raml-path-to-object',
  behaviors: [Polymer.RamlBehavior],
  properties: {
    // Currently selected path by the path selector (or anhy other)
    selectedPath: String,
    // An object read from path.
    selectedObject: {
      type: Object,
      notify: true,
      readOnly: true
    },
    // Parent of the selected object (if any is possible)
    selectedParent: {
      type: Object,
      notify: true,
      readOnly: true
    },
    // True if the selected object is a method definition
    isMethod: {
      type: Boolean,
      value: false,
      notify: true,
      readOnly: true
    },
    // True if the selected object is a resource definition
    isResource: {
      type: Boolean,
      value: false,
      notify: true,
      readOnly: true
    },
    // True if the selected object is a documentation definition
    isDocumentation: {
      type: Boolean,
      value: false,
      notify: true,
      readOnly: true
    },
    // Name of the `<raml-aware>` scope, so it will fill the raml property.
    aware: String,
    // If true, then it will listen for change events instead using data binding
    auto: {
      type: Boolean,
      value: false,
      observer: '_autoChanged'
    }
  },

  observers: [
    '_ramlChanged(raml.*)',
    '_pathChanged(selectedPath, raml)',
    '_fireSelectedObject(selectedObject.*)',
    '_fireSelectedParent(selectedParent.*)',
    '_fireIsMethodState(isMethod)',
    '_fireIsResourceState(isResource)',
    '_fireIsDocumentationState(isDocumentation)'
  ],

  attached: function() {
    this._eventTarget = Polymer.dom(this).host || document;
    this._autoChanged(this.auto);
  },

  _autoChanged: function(state) {
    if (state) {
      this._attacheListeners();
    } else {
      this._detachListeners();
    }
  },

  _attacheListeners: function() {
    if (!this._eventTarget) {
      return;
    }
    this._detachListeners();
    this.listen(this._eventTarget, 'raml-selected-path-changed',
      '_pathChangeHandler');
  },

  _detachListeners: function() {
    if (!this._eventTarget) {
      return;
    }
    this.unlisten(this._eventTarget, 'raml-selected-path-changed',
      '_pathChangeHandler');
  },

  _pathChangeHandler: function(e, detail) {
    this.set('selectedPath', detail.path);
  },

  // Restore properties to the original state
  clear: function() {
    this._setSelectedObject(undefined);
    this._setIsMethod(false);
    this._setIsResource(false);
    this._setIsDocumentation(false);
    this._cachedRegexps = {};
  },
  _ramlChanged: function() {
    this.clear();
  },
  _pathChanged: function(path, raml) {
    if (!raml || !path) {
      return this.clear();
    }
    this._analysePath(path);
    var obj = this._computeObject(path);
    if (!obj) {
      return this.clear();
    }
    this._setSelectedObject(obj);
    this._selectParent(path);
  },

  _analysePath: function(path) {
    var parts = path.split('.');
    parts.pop(); // Last array index
    var type = parts.pop();
    switch (type) {
      case 'resources':
        this._setIsMethod(false);
        this._setIsResource(true);
        this._setIsDocumentation(false);
        break;
      case 'methods':
        this._setIsMethod(true);
        this._setIsResource(false);
        this._setIsDocumentation(false);
        break;
      case 'documentation':
        this._setIsMethod(false);
        this._setIsResource(false);
        this._setIsDocumentation(true);
        break;
      default:
        return this.clear();
    }
  },

  _selectParent: function(path) {
    if (!(this.isMethod || this.isResource)) {
      // No parent.
      return this._setSelectedParent(undefined);
    }
    var parts = path.split('.');
    parts.splice(parts.length - 2, 2);
    var parentPath = parts.join('.');
    if (!parentPath) {
      return this._setSelectedParent(undefined);
    }
    var obj = this.get('raml.' + parentPath);
    if (!obj) {
      return this._setSelectedParent(undefined);
    }
    this._setSelectedParent(obj);
  },
  /**
   * Inserts dependencies definitions to current node.
   * It will update query parameters, uri parameters, security schemas etc with it's definitions.
   *
   * As a result, instead of array of ID's in the `is` property, full definition of trait will
   * be inserted. `uriParameters` will be added as a `uriParameters` property. Ans so on.
   *
   * This function must be called after type of object has been determined.
   * @param {String} path A path to the object.
   */
  _computeObject: function(path) {
    if (this.isDocumentation) {
      // No dependencies here
      return this.get('raml.' + path);
    }
    var current = this.get('raml.' + path);
    return current;
  },

  _fireSelectedObject: function() {
    this.fire('raml-selected-object-changed', {
      selectedObject: this.selectedObject
    });
  },

  _fireSelectedParent: function() {
    this.fire('raml-selected-parent-changed', {
      selectedParent: this.selectedParent
    });
  },

  _fireIsMethodState: function(isMethod) {
    this.fire('raml-is-method-changed', {
      state: isMethod
    });
  },

  _fireIsResourceState: function(isResource) {
    this.fire('raml-is-resource-changed', {
      state: isResource
    });
  },

  _fireIsDocumentationState: function(isDocumentation) {
    this.fire('raml-is-documentation-changed', {
      state: isDocumentation
    });
  }
});
/**
`Polymer.IronFitBehavior` fits an element in another element using `max-height` and `max-width`, and
optionally centers it in the window or another element.

The element will only be sized and/or positioned if it has not already been sized and/or positioned
by CSS.

CSS properties               | Action
-----------------------------|-------------------------------------------
`position` set               | Element is not centered horizontally or vertically
`top` or `bottom` set        | Element is not vertically centered
`left` or `right` set        | Element is not horizontally centered
`max-height` set             | Element respects `max-height`
`max-width` set              | Element respects `max-width`

`Polymer.IronFitBehavior` can position an element into another element using
`verticalAlign` and `horizontalAlign`. This will override the element's css position.

      <div class="container">
        <iron-fit-impl vertical-align="top" horizontal-align="auto">
          Positioned into the container
        </iron-fit-impl>
      </div>

Use `noOverlap` to position the element around another element without overlapping it.

      <div class="container">
        <iron-fit-impl no-overlap vertical-align="auto" horizontal-align="auto">
          Positioned around the container
        </iron-fit-impl>
      </div>

Use `horizontalOffset, verticalOffset` to offset the element from its `positionTarget`;
`Polymer.IronFitBehavior` will collapse these in order to keep the element
within `fitInto` boundaries, while preserving the element's CSS margin values.

      <div class="container">
        <iron-fit-impl vertical-align="top" vertical-offset="20">
          With vertical offset
        </iron-fit-impl>
      </div>


@demo demo/index.html
@polymerBehavior
*/

  Polymer.IronFitBehavior = {

    properties: {

      /**
       * The element that will receive a `max-height`/`width`. By default it is the same as `this`,
       * but it can be set to a child element. This is useful, for example, for implementing a
       * scrolling region inside the element.
       * @type {!Element}
       */
      sizingTarget: {
        type: Object,
        value: function() {
          return this;
        }
      },

      /**
       * The element to fit `this` into.
       */
      fitInto: {
        type: Object,
        value: window
      },

      /**
       * Will position the element around the positionTarget without overlapping it.
       */
      noOverlap: {
        type: Boolean
      },

      /**
       * The element that should be used to position the element. If not set, it will
       * default to the parent node.
       * @type {!Element}
       */
      positionTarget: {
        type: Element
      },

      /**
       * The orientation against which to align the element horizontally
       * relative to the `positionTarget`. Possible values are "left", "right", "auto".
       */
      horizontalAlign: {
        type: String
      },

      /**
       * The orientation against which to align the element vertically
       * relative to the `positionTarget`. Possible values are "top", "bottom", "auto".
       */
      verticalAlign: {
        type: String
      },

      /**
       * If true, it will use `horizontalAlign` and `verticalAlign` values as preferred alignment
       * and if there's not enough space, it will pick the values which minimize the cropping.
       */
      dynamicAlign: {
        type: Boolean
      },

      /**
       * A pixel value that will be added to the position calculated for the
       * given `horizontalAlign`, in the direction of alignment. You can think
       * of it as increasing or decreasing the distance to the side of the
       * screen given by `horizontalAlign`.
       *
       * If `horizontalAlign` is "left", this offset will increase or decrease
       * the distance to the left side of the screen: a negative offset will
       * move the dropdown to the left; a positive one, to the right.
       *
       * Conversely if `horizontalAlign` is "right", this offset will increase
       * or decrease the distance to the right side of the screen: a negative
       * offset will move the dropdown to the right; a positive one, to the left.
       */
      horizontalOffset: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * A pixel value that will be added to the position calculated for the
       * given `verticalAlign`, in the direction of alignment. You can think
       * of it as increasing or decreasing the distance to the side of the
       * screen given by `verticalAlign`.
       *
       * If `verticalAlign` is "top", this offset will increase or decrease
       * the distance to the top side of the screen: a negative offset will
       * move the dropdown upwards; a positive one, downwards.
       *
       * Conversely if `verticalAlign` is "bottom", this offset will increase
       * or decrease the distance to the bottom side of the screen: a negative
       * offset will move the dropdown downwards; a positive one, upwards.
       */
      verticalOffset: {
        type: Number,
        value: 0,
        notify: true
      },

      /**
       * Set to true to auto-fit on attach.
       */
      autoFitOnAttach: {
        type: Boolean,
        value: false
      },

      /** @type {?Object} */
      _fitInfo: {
        type: Object
      }
    },

    get _fitWidth() {
      var fitWidth;
      if (this.fitInto === window) {
        fitWidth = this.fitInto.innerWidth;
      } else {
        fitWidth = this.fitInto.getBoundingClientRect().width;
      }
      return fitWidth;
    },

    get _fitHeight() {
      var fitHeight;
      if (this.fitInto === window) {
        fitHeight = this.fitInto.innerHeight;
      } else {
        fitHeight = this.fitInto.getBoundingClientRect().height;
      }
      return fitHeight;
    },

    get _fitLeft() {
      var fitLeft;
      if (this.fitInto === window) {
        fitLeft = 0;
      } else {
        fitLeft = this.fitInto.getBoundingClientRect().left;
      }
      return fitLeft;
    },

    get _fitTop() {
      var fitTop;
      if (this.fitInto === window) {
        fitTop = 0;
      } else {
        fitTop = this.fitInto.getBoundingClientRect().top;
      }
      return fitTop;
    },

    /**
     * The element that should be used to position the element,
     * if no position target is configured.
     */
    get _defaultPositionTarget() {
      var parent = Polymer.dom(this).parentNode;

      if (parent && parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        parent = parent.host;
      }

      return parent;
    },

    /**
     * The horizontal align value, accounting for the RTL/LTR text direction.
     */
    get _localeHorizontalAlign() {
      if (this._isRTL) {
        // In RTL, "left" becomes "right".
        if (this.horizontalAlign === 'right') {
          return 'left';
        }
        if (this.horizontalAlign === 'left') {
          return 'right';
        }
      }
      return this.horizontalAlign;
    },

    attached: function() {
      // Memoize this to avoid expensive calculations & relayouts.
      // Make sure we do it only once
      if (typeof this._isRTL === 'undefined') {
        this._isRTL = window.getComputedStyle(this).direction == 'rtl';
      }
          
      this.positionTarget = this.positionTarget || this._defaultPositionTarget;
      if (this.autoFitOnAttach) {
        if (window.getComputedStyle(this).display === 'none') {
          setTimeout(function() {
            this.fit();
          }.bind(this));
        } else {
          this.fit();
        }
      }
    },

    /**
     * Positions and fits the element into the `fitInto` element.
     */
    fit: function() {
      this.position();
      this.constrain();
      this.center();
    },

    /**
     * Memoize information needed to position and size the target element.
     * @suppress {deprecated}
     */
    _discoverInfo: function() {
      if (this._fitInfo) {
        return;
      }
      var target = window.getComputedStyle(this);
      var sizer = window.getComputedStyle(this.sizingTarget);

      this._fitInfo = {
        inlineStyle: {
          top: this.style.top || '',
          left: this.style.left || '',
          position: this.style.position || ''
        },
        sizerInlineStyle: {
          maxWidth: this.sizingTarget.style.maxWidth || '',
          maxHeight: this.sizingTarget.style.maxHeight || '',
          boxSizing: this.sizingTarget.style.boxSizing || ''
        },
        positionedBy: {
          vertically: target.top !== 'auto' ? 'top' : (target.bottom !== 'auto' ?
            'bottom' : null),
          horizontally: target.left !== 'auto' ? 'left' : (target.right !== 'auto' ?
            'right' : null)
        },
        sizedBy: {
          height: sizer.maxHeight !== 'none',
          width: sizer.maxWidth !== 'none',
          minWidth: parseInt(sizer.minWidth, 10) || 0,
          minHeight: parseInt(sizer.minHeight, 10) || 0
        },
        margin: {
          top: parseInt(target.marginTop, 10) || 0,
          right: parseInt(target.marginRight, 10) || 0,
          bottom: parseInt(target.marginBottom, 10) || 0,
          left: parseInt(target.marginLeft, 10) || 0
        }
      };
    },

    /**
     * Resets the target element's position and size constraints, and clear
     * the memoized data.
     */
    resetFit: function() {
      var info = this._fitInfo || {};
      for (var property in info.sizerInlineStyle) {
        this.sizingTarget.style[property] = info.sizerInlineStyle[property];
      }
      for (var property in info.inlineStyle) {
        this.style[property] = info.inlineStyle[property];
      }

      this._fitInfo = null;
    },

    /**
     * Equivalent to calling `resetFit()` and `fit()`. Useful to call this after
     * the element or the `fitInto` element has been resized, or if any of the
     * positioning properties (e.g. `horizontalAlign, verticalAlign`) is updated.
     * It preserves the scroll position of the sizingTarget.
     */
    refit: function() {
      var scrollLeft = this.sizingTarget.scrollLeft;
      var scrollTop = this.sizingTarget.scrollTop;
      this.resetFit();
      this.fit();
      this.sizingTarget.scrollLeft = scrollLeft;
      this.sizingTarget.scrollTop = scrollTop;
    },

    /**
     * Positions the element according to `horizontalAlign, verticalAlign`.
     */
    position: function() {
      if (!this.horizontalAlign && !this.verticalAlign) {
        // needs to be centered, and it is done after constrain.
        return;
      }
      this._discoverInfo();

      this.style.position = 'fixed';
      // Need border-box for margin/padding.
      this.sizingTarget.style.boxSizing = 'border-box';
      // Set to 0, 0 in order to discover any offset caused by parent stacking contexts.
      this.style.left = '0px';
      this.style.top = '0px';

      var rect = this.getBoundingClientRect();
      var positionRect = this.__getNormalizedRect(this.positionTarget);
      var fitRect = this.__getNormalizedRect(this.fitInto);

      var margin = this._fitInfo.margin;

      // Consider the margin as part of the size for position calculations.
      var size = {
        width: rect.width + margin.left + margin.right,
        height: rect.height + margin.top + margin.bottom
      };

      var position = this.__getPosition(this._localeHorizontalAlign, this.verticalAlign, size, positionRect, fitRect);

      var left = position.left + margin.left;
      var top = position.top + margin.top;

      // We first limit right/bottom within fitInto respecting the margin,
      // then use those values to limit top/left.
      var right = Math.min(fitRect.right - margin.right, left + rect.width);
      var bottom = Math.min(fitRect.bottom - margin.bottom, top + rect.height);

      // Keep left/top within fitInto respecting the margin.
      left = Math.max(fitRect.left + margin.left,
        Math.min(left, right - this._fitInfo.sizedBy.minWidth));
      top = Math.max(fitRect.top + margin.top,
        Math.min(top, bottom - this._fitInfo.sizedBy.minHeight));

      // Use right/bottom to set maxWidth/maxHeight, and respect minWidth/minHeight.
      this.sizingTarget.style.maxWidth = Math.max(right - left, this._fitInfo.sizedBy.minWidth) + 'px';
      this.sizingTarget.style.maxHeight = Math.max(bottom - top, this._fitInfo.sizedBy.minHeight) + 'px';

      // Remove the offset caused by any stacking context.
      this.style.left = (left - rect.left) + 'px';
      this.style.top = (top - rect.top) + 'px';
    },

    /**
     * Constrains the size of the element to `fitInto` by setting `max-height`
     * and/or `max-width`.
     */
    constrain: function() {
      if (this.horizontalAlign || this.verticalAlign) {
        return;
      }
      this._discoverInfo();

      var info = this._fitInfo;
      // position at (0px, 0px) if not already positioned, so we can measure the natural size.
      if (!info.positionedBy.vertically) {
        this.style.position = 'fixed';
        this.style.top = '0px';
      }
      if (!info.positionedBy.horizontally) {
        this.style.position = 'fixed';
        this.style.left = '0px';
      }

      // need border-box for margin/padding
      this.sizingTarget.style.boxSizing = 'border-box';
      // constrain the width and height if not already set
      var rect = this.getBoundingClientRect();
      if (!info.sizedBy.height) {
        this.__sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
      }
      if (!info.sizedBy.width) {
        this.__sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
      }
    },

    /**
     * @protected
     * @deprecated
     */
    _sizeDimension: function(rect, positionedBy, start, end, extent) {
      this.__sizeDimension(rect, positionedBy, start, end, extent);
    },

    /**
     * @private
     */
    __sizeDimension: function(rect, positionedBy, start, end, extent) {
      var info = this._fitInfo;
      var fitRect = this.__getNormalizedRect(this.fitInto);
      var max = extent === 'Width' ? fitRect.width : fitRect.height;
      var flip = (positionedBy === end);
      var offset = flip ? max - rect[end] : rect[start];
      var margin = info.margin[flip ? start : end];
      var offsetExtent = 'offset' + extent;
      var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
      this.sizingTarget.style['max' + extent] = (max - margin - offset - sizingOffset) + 'px';
    },

    /**
     * Centers horizontally and vertically if not already positioned. This also sets
     * `position:fixed`.
     */
    center: function() {
      if (this.horizontalAlign || this.verticalAlign) {
        return;
      }
      this._discoverInfo();

      var positionedBy = this._fitInfo.positionedBy;
      if (positionedBy.vertically && positionedBy.horizontally) {
        // Already positioned.
        return;
      }
      // Need position:fixed to center
      this.style.position = 'fixed';
      // Take into account the offset caused by parents that create stacking
      // contexts (e.g. with transform: translate3d). Translate to 0,0 and
      // measure the bounding rect.
      if (!positionedBy.vertically) {
        this.style.top = '0px';
      }
      if (!positionedBy.horizontally) {
        this.style.left = '0px';
      }
      // It will take in consideration margins and transforms
      var rect = this.getBoundingClientRect();
      var fitRect = this.__getNormalizedRect(this.fitInto);
      if (!positionedBy.vertically) {
        var top = fitRect.top - rect.top + (fitRect.height - rect.height) / 2;
        this.style.top = top + 'px';
      }
      if (!positionedBy.horizontally) {
        var left = fitRect.left - rect.left + (fitRect.width - rect.width) / 2;
        this.style.left = left + 'px';
      }
    },

    __getNormalizedRect: function(target) {
      if (target === document.documentElement || target === window) {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          right: window.innerWidth,
          bottom: window.innerHeight
        };
      }
      return target.getBoundingClientRect();
    },

    __getCroppedArea: function(position, size, fitRect) {
      var verticalCrop = Math.min(0, position.top) + Math.min(0, fitRect.bottom - (position.top + size.height));
      var horizontalCrop = Math.min(0, position.left) + Math.min(0, fitRect.right - (position.left + size.width));
      return Math.abs(verticalCrop) * size.width + Math.abs(horizontalCrop) * size.height;
    },


    __getPosition: function(hAlign, vAlign, size, positionRect, fitRect) {
      // All the possible configurations.
      // Ordered as top-left, top-right, bottom-left, bottom-right.
      var positions = [{
        verticalAlign: 'top',
        horizontalAlign: 'left',
        top: positionRect.top + this.verticalOffset,
        left: positionRect.left + this.horizontalOffset
      }, {
        verticalAlign: 'top',
        horizontalAlign: 'right',
        top: positionRect.top + this.verticalOffset,
        left: positionRect.right - size.width - this.horizontalOffset
      }, {
        verticalAlign: 'bottom',
        horizontalAlign: 'left',
        top: positionRect.bottom - size.height - this.verticalOffset,
        left: positionRect.left + this.horizontalOffset
      }, {
        verticalAlign: 'bottom',
        horizontalAlign: 'right',
        top: positionRect.bottom - size.height - this.verticalOffset,
        left: positionRect.right - size.width - this.horizontalOffset
      }];

      if (this.noOverlap) {
        // Duplicate.
        for (var i = 0, l = positions.length; i < l; i++) {
          var copy = {};
          for (var key in positions[i]) {
            copy[key] = positions[i][key];
          }
          positions.push(copy);
        }
        // Horizontal overlap only.
        positions[0].top = positions[1].top += positionRect.height;
        positions[2].top = positions[3].top -= positionRect.height;
        // Vertical overlap only.
        positions[4].left = positions[6].left += positionRect.width;
        positions[5].left = positions[7].left -= positionRect.width;
      }

      // Consider auto as null for coding convenience.
      vAlign = vAlign === 'auto' ? null : vAlign;
      hAlign = hAlign === 'auto' ? null : hAlign;

      var position;
      for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];

        // If both vAlign and hAlign are defined, return exact match.
        // For dynamicAlign and noOverlap we'll have more than one candidate, so
        // we'll have to check the croppedArea to make the best choice.
        if (!this.dynamicAlign && !this.noOverlap &&
            pos.verticalAlign === vAlign && pos.horizontalAlign === hAlign) {
          position = pos;
          break;
        }

        // Align is ok if alignment preferences are respected. If no preferences,
        // it is considered ok.
        var alignOk = (!vAlign || pos.verticalAlign === vAlign) &&
                      (!hAlign || pos.horizontalAlign === hAlign);

        // Filter out elements that don't match the alignment (if defined).
        // With dynamicAlign, we need to consider all the positions to find the
        // one that minimizes the cropped area.
        if (!this.dynamicAlign && !alignOk) {
          continue;
        }

        position = position || pos;
        pos.croppedArea = this.__getCroppedArea(pos, size, fitRect);
        var diff = pos.croppedArea - position.croppedArea;
        // Check which crops less. If it crops equally, check if align is ok.
        if (diff < 0 || (diff === 0 && alignOk)) {
          position = pos;
        }
        // If not cropped and respects the align requirements, keep it.
        // This allows to prefer positions overlapping horizontally over the
        // ones overlapping vertically.
        if (position.croppedArea === 0 && alignOk) {
          break;
        }
      }

      return position;
    }

  };
(function() {
'use strict';

  Polymer({

    is: 'iron-overlay-backdrop',

    properties: {

      /**
       * Returns true if the backdrop is opened.
       */
      opened: {
        reflectToAttribute: true,
        type: Boolean,
        value: false,
        observer: '_openedChanged'
      }

    },

    listeners: {
      'transitionend': '_onTransitionend'
    },

    created: function() {
      // Used to cancel previous requestAnimationFrame calls when opened changes.
      this.__openedRaf = null;
    },

    attached: function() {
      this.opened && this._openedChanged(this.opened);
    },

    /**
     * Appends the backdrop to document body if needed.
     */
    prepare: function() {
      if (this.opened && !this.parentNode) {
        Polymer.dom(document.body).appendChild(this);
      }
    },

    /**
     * Shows the backdrop.
     */
    open: function() {
      this.opened = true;
    },

    /**
     * Hides the backdrop.
     */
    close: function() {
      this.opened = false;
    },

    /**
     * Removes the backdrop from document body if needed.
     */
    complete: function() {
      if (!this.opened && this.parentNode === document.body) {
        Polymer.dom(this.parentNode).removeChild(this);
      }
    },

    _onTransitionend: function(event) {
      if (event && event.target === this) {
        this.complete();
      }
    },

    /**
     * @param {boolean} opened
     * @private
     */
    _openedChanged: function(opened) {
      if (opened) {
        // Auto-attach.
        this.prepare();
      } else {
        // Animation might be disabled via the mixin or opacity custom property.
        // If it is disabled in other ways, it's up to the user to call complete.
        var cs = window.getComputedStyle(this);
        if (cs.transitionDuration === '0s' || cs.opacity == 0) {
          this.complete();
        }
      }

      if (!this.isAttached) {
        return;
      }

      // Always cancel previous requestAnimationFrame.
      if (this.__openedRaf) {
        window.cancelAnimationFrame(this.__openedRaf);
        this.__openedRaf = null;
      }
      // Force relayout to ensure proper transitions.
      this.scrollTop = this.scrollTop;
      this.__openedRaf = window.requestAnimationFrame(function() {
        this.__openedRaf = null;
        this.toggleClass('opened', this.opened);
      }.bind(this));
    }
  });

})();
/**
   * @struct
   * @constructor
   * @private
   */
  Polymer.IronOverlayManagerClass = function() {
    /**
     * Used to keep track of the opened overlays.
     * @private {Array<Element>}
     */
    this._overlays = [];

    /**
     * iframes have a default z-index of 100,
     * so this default should be at least that.
     * @private {number}
     */
    this._minimumZ = 101;

    /**
     * Memoized backdrop element.
     * @private {Element|null}
     */
    this._backdropElement = null;

    // Enable document-wide tap recognizer.
    // NOTE: Use useCapture=true to avoid accidentally prevention of the closing
    // of an overlay via event.stopPropagation(). The only way to prevent
    // closing of an overlay should be through its APIs.
    Polymer.Gestures.add(document, 'tap', null);
    document.addEventListener('tap', this._onCaptureClick.bind(this), true);
    document.addEventListener('focus', this._onCaptureFocus.bind(this), true);
    document.addEventListener('keydown', this._onCaptureKeyDown.bind(this), true);
  };

  Polymer.IronOverlayManagerClass.prototype = {

    constructor: Polymer.IronOverlayManagerClass,

    /**
     * The shared backdrop element.
     * @type {!Element} backdropElement
     */
    get backdropElement() {
      if (!this._backdropElement) {
        this._backdropElement = document.createElement('iron-overlay-backdrop');
      }
      return this._backdropElement;
    },

    /**
     * The deepest active element.
     * @type {!Element} activeElement the active element
     */
    get deepActiveElement() {
      // document.activeElement can be null
      // https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
      // In case of null, default it to document.body.
      var active = document.activeElement || document.body;
      while (active.root && Polymer.dom(active.root).activeElement) {
        active = Polymer.dom(active.root).activeElement;
      }
      return active;
    },

    /**
     * Brings the overlay at the specified index to the front.
     * @param {number} i
     * @private
     */
    _bringOverlayAtIndexToFront: function(i) {
      var overlay = this._overlays[i];
      if (!overlay) {
        return;
      }
      var lastI = this._overlays.length - 1;
      var currentOverlay = this._overlays[lastI];
      // Ensure always-on-top overlay stays on top.
      if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
        lastI--;
      }
      // If already the top element, return.
      if (i >= lastI) {
        return;
      }
      // Update z-index to be on top.
      var minimumZ = Math.max(this.currentOverlayZ(), this._minimumZ);
      if (this._getZ(overlay) <= minimumZ) {
        this._applyOverlayZ(overlay, minimumZ);
      }

      // Shift other overlays behind the new on top.
      while (i < lastI) {
        this._overlays[i] = this._overlays[i + 1];
        i++;
      }
      this._overlays[lastI] = overlay;
    },

    /**
     * Adds the overlay and updates its z-index if it's opened, or removes it if it's closed.
     * Also updates the backdrop z-index.
     * @param {!Element} overlay
     */
    addOrRemoveOverlay: function(overlay) {
      if (overlay.opened) {
        this.addOverlay(overlay);
      } else {
        this.removeOverlay(overlay);
      }
    },

    /**
     * Tracks overlays for z-index and focus management.
     * Ensures the last added overlay with always-on-top remains on top.
     * @param {!Element} overlay
     */
    addOverlay: function(overlay) {
      var i = this._overlays.indexOf(overlay);
      if (i >= 0) {
        this._bringOverlayAtIndexToFront(i);
        this.trackBackdrop();
        return;
      }
      var insertionIndex = this._overlays.length;
      var currentOverlay = this._overlays[insertionIndex - 1];
      var minimumZ = Math.max(this._getZ(currentOverlay), this._minimumZ);
      var newZ = this._getZ(overlay);

      // Ensure always-on-top overlay stays on top.
      if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
        // This bumps the z-index of +2.
        this._applyOverlayZ(currentOverlay, minimumZ);
        insertionIndex--;
        // Update minimumZ to match previous overlay's z-index.
        var previousOverlay = this._overlays[insertionIndex - 1];
        minimumZ = Math.max(this._getZ(previousOverlay), this._minimumZ);
      }

      // Update z-index and insert overlay.
      if (newZ <= minimumZ) {
        this._applyOverlayZ(overlay, minimumZ);
      }
      this._overlays.splice(insertionIndex, 0, overlay);

      this.trackBackdrop();
    },

    /**
     * @param {!Element} overlay
     */
    removeOverlay: function(overlay) {
      var i = this._overlays.indexOf(overlay);
      if (i === -1) {
        return;
      }
      this._overlays.splice(i, 1);

      this.trackBackdrop();
    },

    /**
     * Returns the current overlay.
     * @return {Element|undefined}
     */
    currentOverlay: function() {
      var i = this._overlays.length - 1;
      return this._overlays[i];
    },

    /**
     * Returns the current overlay z-index.
     * @return {number}
     */
    currentOverlayZ: function() {
      return this._getZ(this.currentOverlay());
    },

    /**
     * Ensures that the minimum z-index of new overlays is at least `minimumZ`.
     * This does not effect the z-index of any existing overlays.
     * @param {number} minimumZ
     */
    ensureMinimumZ: function(minimumZ) {
      this._minimumZ = Math.max(this._minimumZ, minimumZ);
    },

    focusOverlay: function() {
      var current = /** @type {?} */ (this.currentOverlay());
      if (current) {
        current._applyFocus();
      }
    },

    /**
     * Updates the backdrop z-index.
     */
    trackBackdrop: function() {
      var overlay = this._overlayWithBackdrop();
      // Avoid creating the backdrop if there is no overlay with backdrop.
      if (!overlay && !this._backdropElement) {
        return;
      }
      this.backdropElement.style.zIndex = this._getZ(overlay) - 1;
      this.backdropElement.opened = !!overlay;
    },

    /**
     * @return {Array<Element>}
     */
    getBackdrops: function() {
      var backdrops = [];
      for (var i = 0; i < this._overlays.length; i++) {
        if (this._overlays[i].withBackdrop) {
          backdrops.push(this._overlays[i]);
        }
      }
      return backdrops;
    },

    /**
     * Returns the z-index for the backdrop.
     * @return {number}
     */
    backdropZ: function() {
      return this._getZ(this._overlayWithBackdrop()) - 1;
    },

    /**
     * Returns the first opened overlay that has a backdrop.
     * @return {Element|undefined}
     * @private
     */
    _overlayWithBackdrop: function() {
      for (var i = 0; i < this._overlays.length; i++) {
        if (this._overlays[i].withBackdrop) {
          return this._overlays[i];
        }
      }
    },

    /**
     * Calculates the minimum z-index for the overlay.
     * @param {Element=} overlay
     * @private
     */
    _getZ: function(overlay) {
      var z = this._minimumZ;
      if (overlay) {
        var z1 = Number(overlay.style.zIndex || window.getComputedStyle(overlay).zIndex);
        // Check if is a number
        // Number.isNaN not supported in IE 10+
        if (z1 === z1) {
          z = z1;
        }
      }
      return z;
    },

    /**
     * @param {!Element} element
     * @param {number|string} z
     * @private
     */
    _setZ: function(element, z) {
      element.style.zIndex = z;
    },

    /**
     * @param {!Element} overlay
     * @param {number} aboveZ
     * @private
     */
    _applyOverlayZ: function(overlay, aboveZ) {
      this._setZ(overlay, aboveZ + 2);
    },

    /**
     * Returns the deepest overlay in the path.
     * @param {Array<Element>=} path
     * @return {Element|undefined}
     * @suppress {missingProperties}
     * @private
     */
    _overlayInPath: function(path) {
      path = path || [];
      for (var i = 0; i < path.length; i++) {
        if (path[i]._manager === this) {
          return path[i];
        }
      }
    },

    /**
     * Ensures the click event is delegated to the right overlay.
     * @param {!Event} event
     * @private
     */
    _onCaptureClick: function(event) {
      var overlay = /** @type {?} */ (this.currentOverlay());
      // Check if clicked outside of top overlay.
      if (overlay && this._overlayInPath(Polymer.dom(event).path) !== overlay) {
        overlay._onCaptureClick(event);
      }
    },

    /**
     * Ensures the focus event is delegated to the right overlay.
     * @param {!Event} event
     * @private
     */
    _onCaptureFocus: function(event) {
      var overlay = /** @type {?} */ (this.currentOverlay());
      if (overlay) {
        overlay._onCaptureFocus(event);
      }
    },

    /**
     * Ensures TAB and ESC keyboard events are delegated to the right overlay.
     * @param {!Event} event
     * @private
     */
    _onCaptureKeyDown: function(event) {
      var overlay = /** @type {?} */ (this.currentOverlay());
      if (overlay) {
        if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'esc')) {
          overlay._onCaptureEsc(event);
        } else if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'tab')) {
          overlay._onCaptureTab(event);
        }
      }
    },

    /**
     * Returns if the overlay1 should be behind overlay2.
     * @param {!Element} overlay1
     * @param {!Element} overlay2
     * @return {boolean}
     * @suppress {missingProperties}
     * @private
     */
    _shouldBeBehindOverlay: function(overlay1, overlay2) {
      return !overlay1.alwaysOnTop && overlay2.alwaysOnTop;
    }
  };

  Polymer.IronOverlayManager = new Polymer.IronOverlayManagerClass();
(function() {
    'use strict';

    var p = Element.prototype;
    var matches = p.matches || p.matchesSelector || p.mozMatchesSelector ||
      p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;

    Polymer.IronFocusablesHelper = {

      /**
       * Returns a sorted array of tabbable nodes, including the root node.
       * It searches the tabbable nodes in the light and shadow dom of the chidren,
       * sorting the result by tabindex.
       * @param {!Node} node
       * @return {Array<HTMLElement>}
       */
      getTabbableNodes: function(node) {
        var result = [];
        // If there is at least one element with tabindex > 0, we need to sort
        // the final array by tabindex.
        var needsSortByTabIndex = this._collectTabbableNodes(node, result);
        if (needsSortByTabIndex) {
          return this._sortByTabIndex(result);
        }
        return result;
      },

      /**
       * Returns if a element is focusable.
       * @param {!HTMLElement} element
       * @return {boolean}
       */
      isFocusable: function(element) {
        // From http://stackoverflow.com/a/1600194/4228703:
        // There isn't a definite list, it's up to the browser. The only
        // standard we have is DOM Level 2 HTML https://www.w3.org/TR/DOM-Level-2-HTML/html.html,
        // according to which the only elements that have a focus() method are
        // HTMLInputElement,  HTMLSelectElement, HTMLTextAreaElement and
        // HTMLAnchorElement. This notably omits HTMLButtonElement and
        // HTMLAreaElement.
        // Referring to these tests with tabbables in different browsers
        // http://allyjs.io/data-tables/focusable.html

        // Elements that cannot be focused if they have [disabled] attribute.
        if (matches.call(element, 'input, select, textarea, button, object')) {
          return matches.call(element, ':not([disabled])');
        }
        // Elements that can be focused even if they have [disabled] attribute.
        return matches.call(element,
          'a[href], area[href], iframe, [tabindex], [contentEditable]');
      },

      /**
       * Returns if a element is tabbable. To be tabbable, a element must be
       * focusable, visible, and with a tabindex !== -1.
       * @param {!HTMLElement} element
       * @return {boolean}
       */
      isTabbable: function(element) {
        return this.isFocusable(element) &&
          matches.call(element, ':not([tabindex="-1"])') &&
          this._isVisible(element);
      },

      /**
       * Returns the normalized element tabindex. If not focusable, returns -1.
       * It checks for the attribute "tabindex" instead of the element property
       * `tabIndex` since browsers assign different values to it.
       * e.g. in Firefox `<div contenteditable>` has `tabIndex = -1`
       * @param {!HTMLElement} element
       * @return {!number}
       * @private
       */
      _normalizedTabIndex: function(element) {
        if (this.isFocusable(element)) {
          var tabIndex = element.getAttribute('tabindex') || 0;
          return Number(tabIndex);
        }
        return -1;
      },

      /**
       * Searches for nodes that are tabbable and adds them to the `result` array.
       * Returns if the `result` array needs to be sorted by tabindex.
       * @param {!Node} node The starting point for the search; added to `result`
       * if tabbable.
       * @param {!Array<HTMLElement>} result
       * @return {boolean}
       * @private
       */
      _collectTabbableNodes: function(node, result) {
        // If not an element or not visible, no need to explore children.
        if (node.nodeType !== Node.ELEMENT_NODE || !this._isVisible(node)) {
          return false;
        }
        var element = /** @type {HTMLElement} */ (node);
        var tabIndex = this._normalizedTabIndex(element);
        var needsSortByTabIndex = tabIndex > 0;
        if (tabIndex >= 0) {
          result.push(element);
        }

        // In ShadowDOM v1, tab order is affected by the order of distrubution.
        // E.g. getTabbableNodes(#root) in ShadowDOM v1 should return [#A, #B];
        // in ShadowDOM v0 tab order is not affected by the distrubution order,
        // in fact getTabbableNodes(#root) returns [#B, #A].
        //  <div id="root">
        //   <!-- shadow -->
        //     <slot name="a">
        //     <slot name="b">
        //   <!-- /shadow -->
        //   <input id="A" slot="a">
        //   <input id="B" slot="b" tabindex="1">
        //  </div>
        // TODO(valdrin) support ShadowDOM v1 when upgrading to Polymer v2.0.
        var children;
        if (element.localName === 'content') {
          children = Polymer.dom(element).getDistributedNodes();
        } else {
          // Use shadow root if possible, will check for distributed nodes.
          children = Polymer.dom(element.root || element).children;
        }
        for (var i = 0; i < children.length; i++) {
          // Ensure method is always invoked to collect tabbable children.
          var needsSort = this._collectTabbableNodes(children[i], result);
          needsSortByTabIndex = needsSortByTabIndex || needsSort;
        }
        return needsSortByTabIndex;
      },

      /**
       * Returns false if the element has `visibility: hidden` or `display: none`
       * @param {!HTMLElement} element
       * @return {boolean}
       * @private
       */
      _isVisible: function(element) {
        // Check inline style first to save a re-flow. If looks good, check also
        // computed style.
        var style = element.style;
        if (style.visibility !== 'hidden' && style.display !== 'none') {
          style = window.getComputedStyle(element);
          return (style.visibility !== 'hidden' && style.display !== 'none');
        }
        return false;
      },

      /**
       * Sorts an array of tabbable elements by tabindex. Returns a new array.
       * @param {!Array<HTMLElement>} tabbables
       * @return {Array<HTMLElement>}
       * @private
       */
      _sortByTabIndex: function(tabbables) {
        // Implement a merge sort as Array.prototype.sort does a non-stable sort
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        var len = tabbables.length;
        if (len < 2) {
          return tabbables;
        }
        var pivot = Math.ceil(len / 2);
        var left = this._sortByTabIndex(tabbables.slice(0, pivot));
        var right = this._sortByTabIndex(tabbables.slice(pivot));
        return this._mergeSortByTabIndex(left, right);
      },

      /**
       * Merge sort iterator, merges the two arrays into one, sorted by tab index.
       * @param {!Array<HTMLElement>} left
       * @param {!Array<HTMLElement>} right
       * @return {Array<HTMLElement>}
       * @private
       */
      _mergeSortByTabIndex: function(left, right) {
        var result = [];
        while ((left.length > 0) && (right.length > 0)) {
          if (this._hasLowerTabOrder(left[0], right[0])) {
            result.push(right.shift());
          } else {
            result.push(left.shift());
          }
        }

        return result.concat(left, right);
      },

      /**
       * Returns if element `a` has lower tab order compared to element `b`
       * (both elements are assumed to be focusable and tabbable).
       * Elements with tabindex = 0 have lower tab order compared to elements
       * with tabindex > 0.
       * If both have same tabindex, it returns false.
       * @param {!HTMLElement} a
       * @param {!HTMLElement} b
       * @return {boolean}
       * @private
       */
      _hasLowerTabOrder: function(a, b) {
        // Normalize tabIndexes
        // e.g. in Firefox `<div contenteditable>` has `tabIndex = -1`
        var ati = Math.max(a.tabIndex, 0);
        var bti = Math.max(b.tabIndex, 0);
        return (ati === 0 || bti === 0) ? bti > ati : ati > bti;
      }
    };
  })();
(function() {
  'use strict';

  /** @polymerBehavior */
  Polymer.IronOverlayBehaviorImpl = {

    properties: {

      /**
       * True if the overlay is currently displayed.
       */
      opened: {
        observer: '_openedChanged',
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * True if the overlay was canceled when it was last closed.
       */
      canceled: {
        observer: '_canceledChanged',
        readOnly: true,
        type: Boolean,
        value: false
      },

      /**
       * Set to true to display a backdrop behind the overlay. It traps the focus
       * within the light DOM of the overlay.
       */
      withBackdrop: {
        observer: '_withBackdropChanged',
        type: Boolean
      },

      /**
       * Set to true to disable auto-focusing the overlay or child nodes with
       * the `autofocus` attribute` when the overlay is opened.
       */
      noAutoFocus: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay with the ESC key.
       */
      noCancelOnEscKey: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable canceling the overlay by clicking outside it.
       */
      noCancelOnOutsideClick: {
        type: Boolean,
        value: false
      },

      /**
       * Contains the reason(s) this overlay was last closed (see `iron-overlay-closed`).
       * `IronOverlayBehavior` provides the `canceled` reason; implementers of the
       * behavior can provide other reasons in addition to `canceled`.
       */
      closingReason: {
        // was a getter before, but needs to be a property so other
        // behaviors can override this.
        type: Object
      },

      /**
       * Set to true to enable restoring of focus when overlay is closed.
       */
      restoreFocusOnClose: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to keep overlay always on top.
       */
      alwaysOnTop: {
        type: Boolean
      },

      /**
       * Shortcut to access to the overlay manager.
       * @private
       * @type {Polymer.IronOverlayManagerClass}
       */
      _manager: {
        type: Object,
        value: Polymer.IronOverlayManager
      },

      /**
       * The node being focused.
       * @type {?Node}
       */
      _focusedChild: {
        type: Object
      }

    },

    listeners: {
      'iron-resize': '_onIronResize'
    },

    /**
     * The backdrop element.
     * @type {Element}
     */
    get backdropElement() {
      return this._manager.backdropElement;
    },

    /**
     * Returns the node to give focus to.
     * @type {Node}
     */
    get _focusNode() {
      return this._focusedChild || Polymer.dom(this).querySelector('[autofocus]') || this;
    },

    /**
     * Array of nodes that can receive focus (overlay included), ordered by `tabindex`.
     * This is used to retrieve which is the first and last focusable nodes in order
     * to wrap the focus for overlays `with-backdrop`.
     *
     * If you know what is your content (specifically the first and last focusable children),
     * you can override this method to return only `[firstFocusable, lastFocusable];`
     * @type {Array<Node>}
     * @protected
     */
    get _focusableNodes() {
      return Polymer.IronFocusablesHelper.getTabbableNodes(this);
    },

    ready: function() {
      // Used to skip calls to notifyResize and refit while the overlay is animating.
      this.__isAnimating = false;
      // with-backdrop needs tabindex to be set in order to trap the focus.
      // If it is not set, IronOverlayBehavior will set it, and remove it if with-backdrop = false.
      this.__shouldRemoveTabIndex = false;
      // Used for wrapping the focus on TAB / Shift+TAB.
      this.__firstFocusableNode = this.__lastFocusableNode = null;
      // Used by __onNextAnimationFrame to cancel any previous callback.
      this.__raf = null;
      // Focused node before overlay gets opened. Can be restored on close.
      this.__restoreFocusNode = null;
      this._ensureSetup();
    },

    attached: function() {
      // Call _openedChanged here so that position can be computed correctly.
      if (this.opened) {
        this._openedChanged(this.opened);
      }
      this._observer = Polymer.dom(this).observeNodes(this._onNodesChange);
    },

    detached: function() {
      Polymer.dom(this).unobserveNodes(this._observer);
      this._observer = null;
      if (this.__raf) {
        window.cancelAnimationFrame(this.__raf);
        this.__raf = null;
      }
      this._manager.removeOverlay(this);
    },

    /**
     * Toggle the opened state of the overlay.
     */
    toggle: function() {
      this._setCanceled(false);
      this.opened = !this.opened;
    },

    /**
     * Open the overlay.
     */
    open: function() {
      this._setCanceled(false);
      this.opened = true;
    },

    /**
     * Close the overlay.
     */
    close: function() {
      this._setCanceled(false);
      this.opened = false;
    },

    /**
     * Cancels the overlay.
     * @param {Event=} event The original event
     */
    cancel: function(event) {
      var cancelEvent = this.fire('iron-overlay-canceled', event, {cancelable: true});
      if (cancelEvent.defaultPrevented) {
        return;
      }

      this._setCanceled(true);
      this.opened = false;
    },

    /**
     * Invalidates the cached tabbable nodes. To be called when any of the focusable
     * content changes (e.g. a button is disabled).
     */
    invalidateTabbables: function() {
      this.__firstFocusableNode = this.__lastFocusableNode = null;
    },

    _ensureSetup: function() {
      if (this._overlaySetup) {
        return;
      }
      this._overlaySetup = true;
      this.style.outline = 'none';
      this.style.display = 'none';
    },

    /**
     * Called when `opened` changes.
     * @param {boolean=} opened
     * @protected
     */
    _openedChanged: function(opened) {
      if (opened) {
        this.removeAttribute('aria-hidden');
      } else {
        this.setAttribute('aria-hidden', 'true');
      }

      // Defer any animation-related code on attached
      // (_openedChanged gets called again on attached).
      if (!this.isAttached) {
        return;
      }

      this.__isAnimating = true;

      // Use requestAnimationFrame for non-blocking rendering.
      this.__onNextAnimationFrame(this.__openedChanged);
    },

    _canceledChanged: function() {
      this.closingReason = this.closingReason || {};
      this.closingReason.canceled = this.canceled;
    },

    _withBackdropChanged: function() {
      // If tabindex is already set, no need to override it.
      if (this.withBackdrop && !this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '-1');
        this.__shouldRemoveTabIndex = true;
      } else if (this.__shouldRemoveTabIndex) {
        this.removeAttribute('tabindex');
        this.__shouldRemoveTabIndex = false;
      }
      if (this.opened && this.isAttached) {
        this._manager.trackBackdrop();
      }
    },

    /**
     * tasks which must occur before opening; e.g. making the element visible.
     * @protected
     */
    _prepareRenderOpened: function() {
      // Store focused node.
      this.__restoreFocusNode = this._manager.deepActiveElement;

      // Needed to calculate the size of the overlay so that transitions on its size
      // will have the correct starting points.
      this._preparePositioning();
      this.refit();
      this._finishPositioning();

      // Safari will apply the focus to the autofocus element when displayed
      // for the first time, so we make sure to return the focus where it was.
      if (this.noAutoFocus && document.activeElement === this._focusNode) {
        this._focusNode.blur();
        this.__restoreFocusNode.focus();
      }
    },

    /**
     * Tasks which cause the overlay to actually open; typically play an animation.
     * @protected
     */
    _renderOpened: function() {
      this._finishRenderOpened();
    },

    /**
     * Tasks which cause the overlay to actually close; typically play an animation.
     * @protected
     */
    _renderClosed: function() {
      this._finishRenderClosed();
    },

    /**
     * Tasks to be performed at the end of open action. Will fire `iron-overlay-opened`.
     * @protected
     */
    _finishRenderOpened: function() {
      this.notifyResize();
      this.__isAnimating = false;

      this.fire('iron-overlay-opened');
    },

    /**
     * Tasks to be performed at the end of close action. Will fire `iron-overlay-closed`.
     * @protected
     */
    _finishRenderClosed: function() {
      // Hide the overlay.
      this.style.display = 'none';
      // Reset z-index only at the end of the animation.
      this.style.zIndex = '';
      this.notifyResize();
      this.__isAnimating = false;
      this.fire('iron-overlay-closed', this.closingReason);
    },

    _preparePositioning: function() {
      this.style.transition = this.style.webkitTransition = 'none';
      this.style.transform = this.style.webkitTransform = 'none';
      this.style.display = '';
    },

    _finishPositioning: function() {
      // First, make it invisible & reactivate animations.
      this.style.display = 'none';
      // Force reflow before re-enabling animations so that they don't start.
      // Set scrollTop to itself so that Closure Compiler doesn't remove this.
      this.scrollTop = this.scrollTop;
      this.style.transition = this.style.webkitTransition = '';
      this.style.transform = this.style.webkitTransform = '';
      // Now that animations are enabled, make it visible again
      this.style.display = '';
      // Force reflow, so that following animations are properly started.
      // Set scrollTop to itself so that Closure Compiler doesn't remove this.
      this.scrollTop = this.scrollTop;
    },

    /**
     * Applies focus according to the opened state.
     * @protected
     */
    _applyFocus: function() {
      if (this.opened) {
        if (!this.noAutoFocus) {
          this._focusNode.focus();
        }
      }
      else {
        this._focusNode.blur();
        this._focusedChild = null;
        // Restore focus.
        if (this.restoreFocusOnClose && this.__restoreFocusNode) {
          this.__restoreFocusNode.focus();
        }
        this.__restoreFocusNode = null;
        // If many overlays get closed at the same time, one of them would still
        // be the currentOverlay even if already closed, and would call _applyFocus
        // infinitely, so we check for this not to be the current overlay.
        var currentOverlay = this._manager.currentOverlay();
        if (currentOverlay && this !== currentOverlay) {
          currentOverlay._applyFocus();
        }
      }
    },

    /**
     * Cancels (closes) the overlay. Call when click happens outside the overlay.
     * @param {!Event} event
     * @protected
     */
    _onCaptureClick: function(event) {
      if (!this.noCancelOnOutsideClick) {
        this.cancel(event);
      }
    },

    /**
     * Keeps track of the focused child. If withBackdrop, traps focus within overlay.
     * @param {!Event} event
     * @protected
     */
    _onCaptureFocus: function (event) {
      if (!this.withBackdrop) {
        return;
      }
      var path = Polymer.dom(event).path;
      if (path.indexOf(this) === -1) {
        event.stopPropagation();
        this._applyFocus();
      } else {
        this._focusedChild = path[0];
      }
    },

    /**
     * Handles the ESC key event and cancels (closes) the overlay.
     * @param {!Event} event
     * @protected
     */
    _onCaptureEsc: function(event) {
      if (!this.noCancelOnEscKey) {
        this.cancel(event);
      }
    },

    /**
     * Handles TAB key events to track focus changes.
     * Will wrap focus for overlays withBackdrop.
     * @param {!Event} event
     * @protected
     */
    _onCaptureTab: function(event) {
      if (!this.withBackdrop) {
        return;
      }
      this.__ensureFirstLastFocusables();
      // TAB wraps from last to first focusable.
      // Shift + TAB wraps from first to last focusable.
      var shift = event.shiftKey;
      var nodeToCheck = shift ? this.__firstFocusableNode : this.__lastFocusableNode;
      var nodeToSet = shift ? this.__lastFocusableNode : this.__firstFocusableNode;
      var shouldWrap = false;
      if (nodeToCheck === nodeToSet) {
        // If nodeToCheck is the same as nodeToSet, it means we have an overlay
        // with 0 or 1 focusables; in either case we still need to trap the
        // focus within the overlay.
        shouldWrap = true;
      } else {
        // In dom=shadow, the manager will receive focus changes on the main
        // root but not the ones within other shadow roots, so we can't rely on
        // _focusedChild, but we should check the deepest active element.
        var focusedNode = this._manager.deepActiveElement;
        // If the active element is not the nodeToCheck but the overlay itself,
        // it means the focus is about to go outside the overlay, hence we
        // should prevent that (e.g. user opens the overlay and hit Shift+TAB).
        shouldWrap = (focusedNode === nodeToCheck || focusedNode === this);
      }

      if (shouldWrap) {
        // When the overlay contains the last focusable element of the document
        // and it's already focused, pressing TAB would move the focus outside
        // the document (e.g. to the browser search bar). Similarly, when the
        // overlay contains the first focusable element of the document and it's
        // already focused, pressing Shift+TAB would move the focus outside the
        // document (e.g. to the browser search bar).
        // In both cases, we would not receive a focus event, but only a blur.
        // In order to achieve focus wrapping, we prevent this TAB event and
        // force the focus. This will also prevent the focus to temporarily move
        // outside the overlay, which might cause scrolling.
        event.preventDefault();
        this._focusedChild = nodeToSet;
        this._applyFocus();
      }
    },

    /**
     * Refits if the overlay is opened and not animating.
     * @protected
     */
    _onIronResize: function() {
      if (this.opened && !this.__isAnimating) {
        this.__onNextAnimationFrame(this.refit);
      }
    },

    /**
     * Will call notifyResize if overlay is opened.
     * Can be overridden in order to avoid multiple observers on the same node.
     * @protected
     */
    _onNodesChange: function() {
      if (this.opened && !this.__isAnimating) {
        // It might have added focusable nodes, so invalidate cached values.
        this.invalidateTabbables();
        this.notifyResize();
      }
    },

    /**
     * Will set first and last focusable nodes if any of them is not set.
     * @private
     */
    __ensureFirstLastFocusables: function() {
      if (!this.__firstFocusableNode || !this.__lastFocusableNode) {
        var focusableNodes = this._focusableNodes;
        this.__firstFocusableNode = focusableNodes[0];
        this.__lastFocusableNode = focusableNodes[focusableNodes.length - 1];
      }
    },

    /**
     * Tasks executed when opened changes: prepare for the opening, move the
     * focus, update the manager, render opened/closed.
     * @private
     */
    __openedChanged: function() {
      if (this.opened) {
        // Make overlay visible, then add it to the manager.
        this._prepareRenderOpened();
        this._manager.addOverlay(this);
        // Move the focus to the child node with [autofocus].
        this._applyFocus();

        this._renderOpened();
      } else {
        // Remove overlay, then restore the focus before actually closing.
        this._manager.removeOverlay(this);
        this._applyFocus();

        this._renderClosed();
      }
    },

    /**
     * Executes a callback on the next animation frame, overriding any previous
     * callback awaiting for the next animation frame. e.g.
     * `__onNextAnimationFrame(callback1) && __onNextAnimationFrame(callback2)`;
     * `callback1` will never be invoked.
     * @param {!Function} callback Its `this` parameter is the overlay itself.
     * @private
     */
    __onNextAnimationFrame: function(callback) {
      if (this.__raf) {
        window.cancelAnimationFrame(this.__raf);
      }
      var self = this;
      this.__raf = window.requestAnimationFrame(function nextAnimationFrame() {
        self.__raf = null;
        callback.call(self);
      });
    }

  };

  /**
  Use `Polymer.IronOverlayBehavior` to implement an element that can be hidden or shown, and displays
  on top of other content. It includes an optional backdrop, and can be used to implement a variety
  of UI controls including dialogs and drop downs. Multiple overlays may be displayed at once.

  See the [demo source code](https://github.com/PolymerElements/iron-overlay-behavior/blob/master/demo/simple-overlay.html)
  for an example.

  ### Closing and canceling

  An overlay may be hidden by closing or canceling. The difference between close and cancel is user
  intent. Closing generally implies that the user acknowledged the content on the overlay. By default,
  it will cancel whenever the user taps outside it or presses the escape key. This behavior is
  configurable with the `no-cancel-on-esc-key` and the `no-cancel-on-outside-click` properties.
  `close()` should be called explicitly by the implementer when the user interacts with a control
  in the overlay element. When the dialog is canceled, the overlay fires an 'iron-overlay-canceled'
  event. Call `preventDefault` on this event to prevent the overlay from closing.

  ### Positioning

  By default the element is sized and positioned to fit and centered inside the window. You can
  position and size it manually using CSS. See `Polymer.IronFitBehavior`.

  ### Backdrop

  Set the `with-backdrop` attribute to display a backdrop behind the overlay. The backdrop is
  appended to `<body>` and is of type `<iron-overlay-backdrop>`. See its doc page for styling
  options.

  In addition, `with-backdrop` will wrap the focus within the content in the light DOM.
  Override the [`_focusableNodes` getter](#Polymer.IronOverlayBehavior:property-_focusableNodes)
  to achieve a different behavior.

  ### Limitations

  The element is styled to appear on top of other content by setting its `z-index` property. You
  must ensure no element has a stacking context with a higher `z-index` than its parent stacking
  context. You should place this element as a child of `<body>` whenever possible.

  @demo demo/index.html
  @polymerBehavior
  */
  Polymer.IronOverlayBehavior = [Polymer.IronFitBehavior, Polymer.IronResizableBehavior, Polymer.IronOverlayBehaviorImpl];

  /**
   * Fired after the overlay opens.
   * @event iron-overlay-opened
   */

  /**
   * Fired when the overlay is canceled, but before it is closed.
   * @event iron-overlay-canceled
   * @param {Event} event The closing of the overlay can be prevented
   * by calling `event.preventDefault()`. The `event.detail` is the original event that
   * originated the canceling (e.g. ESC keyboard event or click event outside the overlay).
   */

  /**
   * Fired after the overlay closes.
   * @event iron-overlay-closed
   * @param {Event} event The `event.detail` is the `closingReason` property
   * (contains `canceled`, whether the overlay was canceled).
   */

})();
/**
   * `Polymer.NeonAnimatableBehavior` is implemented by elements containing animations for use with
   * elements implementing `Polymer.NeonAnimationRunnerBehavior`.
   * @polymerBehavior
   */
  Polymer.NeonAnimatableBehavior = {

    properties: {

      /**
       * Animation configuration. See README for more info.
       */
      animationConfig: {
        type: Object
      },

      /**
       * Convenience property for setting an 'entry' animation. Do not set `animationConfig.entry`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      entryAnimation: {
        observer: '_entryAnimationChanged',
        type: String
      },

      /**
       * Convenience property for setting an 'exit' animation. Do not set `animationConfig.exit`
       * manually if using this. The animated node is set to `this` if using this property.
       */
      exitAnimation: {
        observer: '_exitAnimationChanged',
        type: String
      }

    },

    _entryAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      this.animationConfig['entry'] = [{
        name: this.entryAnimation,
        node: this
      }];
    },

    _exitAnimationChanged: function() {
      this.animationConfig = this.animationConfig || {};
      this.animationConfig['exit'] = [{
        name: this.exitAnimation,
        node: this
      }];
    },

    _copyProperties: function(config1, config2) {
      // shallowly copy properties from config2 to config1
      for (var property in config2) {
        config1[property] = config2[property];
      }
    },

    _cloneConfig: function(config) {
      var clone = {
        isClone: true
      };
      this._copyProperties(clone, config);
      return clone;
    },

    _getAnimationConfigRecursive: function(type, map, allConfigs) {
      if (!this.animationConfig) {
        return;
      }

      if(this.animationConfig.value && typeof this.animationConfig.value === 'function') {
      	this._warn(this._logf('playAnimation', "Please put 'animationConfig' inside of your components 'properties' object instead of outside of it."));
      	return;
      }

      // type is optional
      var thisConfig;
      if (type) {
        thisConfig = this.animationConfig[type];
      } else {
        thisConfig = this.animationConfig;
      }

      if (!Array.isArray(thisConfig)) {
        thisConfig = [thisConfig];
      }

      // iterate animations and recurse to process configurations from child nodes
      if (thisConfig) {
        for (var config, index = 0; config = thisConfig[index]; index++) {
          if (config.animatable) {
            config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
          } else {
            if (config.id) {
              var cachedConfig = map[config.id];
              if (cachedConfig) {
                // merge configurations with the same id, making a clone lazily
                if (!cachedConfig.isClone) {
                  map[config.id] = this._cloneConfig(cachedConfig)
                  cachedConfig = map[config.id];
                }
                this._copyProperties(cachedConfig, config);
              } else {
                // put any configs with an id into a map
                map[config.id] = config;
              }
            } else {
              allConfigs.push(config);
            }
          }
        }
      }
    },

    /**
     * An element implementing `Polymer.NeonAnimationRunnerBehavior` calls this method to configure
     * an animation with an optional type. Elements implementing `Polymer.NeonAnimatableBehavior`
     * should define the property `animationConfig`, which is either a configuration object
     * or a map of animation type to array of configuration objects.
     */
    getAnimationConfig: function(type) {
      var map = {};
      var allConfigs = [];
      this._getAnimationConfigRecursive(type, map, allConfigs);
      // append the configurations saved in the map to the array
      for (var key in map) {
        allConfigs.push(map[key]);
      }
      return allConfigs;
    }

  };
/**
   * `Polymer.NeonAnimationRunnerBehavior` adds a method to run animations.
   *
   * @polymerBehavior Polymer.NeonAnimationRunnerBehavior
   */
  Polymer.NeonAnimationRunnerBehaviorImpl = {

    _configureAnimations: function(configs) {
      var results = [];
      if (configs.length > 0) {
        for (var config, index = 0; config = configs[index]; index++) {
          var neonAnimation = document.createElement(config.name);
          // is this element actually a neon animation?
          if (neonAnimation.isNeonAnimation) {
            var result = null;
            // configuration or play could fail if polyfills aren't loaded
            try {
              result = neonAnimation.configure(config);
              // Check if we have an Effect rather than an Animation
              if (typeof result.cancel != 'function') { 
                result = document.timeline.play(result);
              }
            } catch (e) {
              result = null;
              console.warn('Couldnt play', '(', config.name, ').', e);
            }
            if (result) {
              results.push({
                neonAnimation: neonAnimation,
                config: config,
                animation: result,
              });
            }
          } else {
            console.warn(this.is + ':', config.name, 'not found!');
          }
        }
      }
      return results;
    },

    _shouldComplete: function(activeEntries) {
      var finished = true;
      for (var i = 0; i < activeEntries.length; i++) {
        if (activeEntries[i].animation.playState != 'finished') {
          finished = false;
          break;
        }
      }
      return finished;
    },

    _complete: function(activeEntries) {
      for (var i = 0; i < activeEntries.length; i++) {
        activeEntries[i].neonAnimation.complete(activeEntries[i].config);
      }
      for (var i = 0; i < activeEntries.length; i++) {
        activeEntries[i].animation.cancel();
      }
    },

    /**
     * Plays an animation with an optional `type`.
     * @param {string=} type
     * @param {!Object=} cookie
     */
    playAnimation: function(type, cookie) {
      var configs = this.getAnimationConfig(type);
      if (!configs) {
        return;
      }
      this._active = this._active || {};
      if (this._active[type]) {
        this._complete(this._active[type]);
        delete this._active[type];
      }

      var activeEntries = this._configureAnimations(configs);

      if (activeEntries.length == 0) {
        this.fire('neon-animation-finish', cookie, {bubbles: false});
        return;
      }

      this._active[type] = activeEntries;

      for (var i = 0; i < activeEntries.length; i++) {
        activeEntries[i].animation.onfinish = function() {
          if (this._shouldComplete(activeEntries)) {
            this._complete(activeEntries);
            delete this._active[type];
            this.fire('neon-animation-finish', cookie, {bubbles: false});
          }
        }.bind(this);
      }
    },

    /**
     * Cancels the currently running animations.
     */
    cancelAnimation: function() {
      for (var k in this._animations) {
        this._animations[k].cancel();
      }
      this._animations = {};
    }
  };

  /** @polymerBehavior Polymer.NeonAnimationRunnerBehavior */
  Polymer.NeonAnimationRunnerBehavior = [
    Polymer.NeonAnimatableBehavior,
    Polymer.NeonAnimationRunnerBehaviorImpl
  ];
/**
   * Use `Polymer.NeonAnimationBehavior` to implement an animation.
   * @polymerBehavior
   */
  Polymer.NeonAnimationBehavior = {

    properties: {

      /**
       * Defines the animation timing.
       */
      animationTiming: {
        type: Object,
        value: function() {
          return {
            duration: 500,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'both'
          }
        }
      }

    },

    /**
     * Can be used to determine that elements implement this behavior.
     */
    isNeonAnimation: true,

    /**
     * Do any animation configuration here.
     */
    // configure: function(config) {
    // },

    /**
     * Returns the animation timing by mixing in properties from `config` to the defaults defined
     * by the animation.
     */
    timingFromConfig: function(config) {
      if (config.timing) {
        for (var property in config.timing) {
          this.animationTiming[property] = config.timing[property];
        }
      }
      return this.animationTiming;
    },

    /**
     * Sets `transform` and `transformOrigin` properties along with the prefixed versions.
     */
    setPrefixedProperty: function(node, property, value) {
      var map = {
        'transform': ['webkitTransform'],
        'transformOrigin': ['mozTransformOrigin', 'webkitTransformOrigin']
      };
      var prefixes = map[property];
      for (var prefix, index = 0; prefix = prefixes[index]; index++) {
        node.style[prefix] = value;
      }
      node.style[property] = value;
    },

    /**
     * Called when the animation finishes.
     */
    complete: function() {}

  };
// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

!function(a,b){var c={},d={},e={},f=null;!function(a,b){function c(a){if("number"==typeof a)return a;var b={};for(var c in a)b[c]=a[c];return b}function d(){this._delay=0,this._endDelay=0,this._fill="none",this._iterationStart=0,this._iterations=1,this._duration=0,this._playbackRate=1,this._direction="normal",this._easing="linear",this._easingFunction=x}function e(){return a.isDeprecated("Invalid timing inputs","2016-03-02","TypeError exceptions will be thrown instead.",!0)}function f(b,c,e){var f=new d;return c&&(f.fill="both",f.duration="auto"),"number"!=typeof b||isNaN(b)?void 0!==b&&Object.getOwnPropertyNames(b).forEach(function(c){if("auto"!=b[c]){if(("number"==typeof f[c]||"duration"==c)&&("number"!=typeof b[c]||isNaN(b[c])))return;if("fill"==c&&v.indexOf(b[c])==-1)return;if("direction"==c&&w.indexOf(b[c])==-1)return;if("playbackRate"==c&&1!==b[c]&&a.isDeprecated("AnimationEffectTiming.playbackRate","2014-11-28","Use Animation.playbackRate instead."))return;f[c]=b[c]}}):f.duration=b,f}function g(a){return"number"==typeof a&&(a=isNaN(a)?{duration:0}:{duration:a}),a}function h(b,c){return b=a.numericTimingToObject(b),f(b,c)}function i(a,b,c,d){return a<0||a>1||c<0||c>1?x:function(e){function f(a,b,c){return 3*a*(1-c)*(1-c)*c+3*b*(1-c)*c*c+c*c*c}if(e<=0){var g=0;return a>0?g=b/a:!b&&c>0&&(g=d/c),g*e}if(e>=1){var h=0;return c<1?h=(d-1)/(c-1):1==c&&a<1&&(h=(b-1)/(a-1)),1+h*(e-1)}for(var i=0,j=1;i<j;){var k=(i+j)/2,l=f(a,c,k);if(Math.abs(e-l)<1e-5)return f(b,d,k);l<e?i=k:j=k}return f(b,d,k)}}function j(a,b){return function(c){if(c>=1)return 1;var d=1/a;return c+=b*d,c-c%d}}function k(a){C||(C=document.createElement("div").style),C.animationTimingFunction="",C.animationTimingFunction=a;var b=C.animationTimingFunction;if(""==b&&e())throw new TypeError(a+" is not a valid value for easing");return b}function l(a){if("linear"==a)return x;var b=E.exec(a);if(b)return i.apply(this,b.slice(1).map(Number));var c=F.exec(a);if(c)return j(Number(c[1]),{start:y,middle:z,end:A}[c[2]]);var d=B[a];return d?d:x}function m(a){return Math.abs(n(a)/a.playbackRate)}function n(a){return 0===a.duration||0===a.iterations?0:a.duration*a.iterations}function o(a,b,c){if(null==b)return G;var d=c.delay+a+c.endDelay;return b<Math.min(c.delay,d)?H:b>=Math.min(c.delay+a,d)?I:J}function p(a,b,c,d,e){switch(d){case H:return"backwards"==b||"both"==b?0:null;case J:return c-e;case I:return"forwards"==b||"both"==b?a:null;case G:return null}}function q(a,b,c,d,e){var f=e;return 0===a?b!==H&&(f+=c):f+=d/a,f}function r(a,b,c,d,e,f){var g=a===1/0?b%1:a%1;return 0!==g||c!==I||0===d||0===e&&0!==f||(g=1),g}function s(a,b,c,d){return a===I&&b===1/0?1/0:1===c?Math.floor(d)-1:Math.floor(d)}function t(a,b,c){var d=a;if("normal"!==a&&"reverse"!==a){var e=b;"alternate-reverse"===a&&(e+=1),d="normal",e!==1/0&&e%2!==0&&(d="reverse")}return"normal"===d?c:1-c}function u(a,b,c){var d=o(a,b,c),e=p(a,c.fill,b,d,c.delay);if(null===e)return null;var f=q(c.duration,d,c.iterations,e,c.iterationStart),g=r(f,c.iterationStart,d,c.iterations,e,c.duration),h=s(d,c.iterations,g,f),i=t(c.direction,h,g);return c._easingFunction(i)}var v="backwards|forwards|both|none".split("|"),w="reverse|alternate|alternate-reverse".split("|"),x=function(a){return a};d.prototype={_setMember:function(b,c){this["_"+b]=c,this._effect&&(this._effect._timingInput[b]=c,this._effect._timing=a.normalizeTimingInput(this._effect._timingInput),this._effect.activeDuration=a.calculateActiveDuration(this._effect._timing),this._effect._animation&&this._effect._animation._rebuildUnderlyingAnimation())},get playbackRate(){return this._playbackRate},set delay(a){this._setMember("delay",a)},get delay(){return this._delay},set endDelay(a){this._setMember("endDelay",a)},get endDelay(){return this._endDelay},set fill(a){this._setMember("fill",a)},get fill(){return this._fill},set iterationStart(a){if((isNaN(a)||a<0)&&e())throw new TypeError("iterationStart must be a non-negative number, received: "+timing.iterationStart);this._setMember("iterationStart",a)},get iterationStart(){return this._iterationStart},set duration(a){if("auto"!=a&&(isNaN(a)||a<0)&&e())throw new TypeError("duration must be non-negative or auto, received: "+a);this._setMember("duration",a)},get duration(){return this._duration},set direction(a){this._setMember("direction",a)},get direction(){return this._direction},set easing(a){this._easingFunction=l(k(a)),this._setMember("easing",a)},get easing(){return this._easing},set iterations(a){if((isNaN(a)||a<0)&&e())throw new TypeError("iterations must be non-negative, received: "+a);this._setMember("iterations",a)},get iterations(){return this._iterations}};var y=1,z=.5,A=0,B={ease:i(.25,.1,.25,1),"ease-in":i(.42,0,1,1),"ease-out":i(0,0,.58,1),"ease-in-out":i(.42,0,.58,1),"step-start":j(1,y),"step-middle":j(1,z),"step-end":j(1,A)},C=null,D="\\s*(-?\\d+\\.?\\d*|-?\\.\\d+)\\s*",E=new RegExp("cubic-bezier\\("+D+","+D+","+D+","+D+"\\)"),F=/steps\(\s*(\d+)\s*,\s*(start|middle|end)\s*\)/,G=0,H=1,I=2,J=3;a.cloneTimingInput=c,a.makeTiming=f,a.numericTimingToObject=g,a.normalizeTimingInput=h,a.calculateActiveDuration=m,a.calculateIterationProgress=u,a.calculatePhase=o,a.normalizeEasing=k,a.parseEasingFunction=l}(c,f),function(a,b){function c(a,b){return a in k?k[a][b]||b:b}function d(a){return"display"===a||0===a.lastIndexOf("animation",0)||0===a.lastIndexOf("transition",0)}function e(a,b,e){if(!d(a)){var f=h[a];if(f){i.style[a]=b;for(var g in f){var j=f[g],k=i.style[j];e[j]=c(j,k)}}else e[a]=c(a,b)}}function f(a){var b=[];for(var c in a)if(!(c in["easing","offset","composite"])){var d=a[c];Array.isArray(d)||(d=[d]);for(var e,f=d.length,g=0;g<f;g++)e={},"offset"in a?e.offset=a.offset:1==f?e.offset=1:e.offset=g/(f-1),"easing"in a&&(e.easing=a.easing),"composite"in a&&(e.composite=a.composite),e[c]=d[g],b.push(e)}return b.sort(function(a,b){return a.offset-b.offset}),b}function g(b){function c(){var a=d.length;null==d[a-1].offset&&(d[a-1].offset=1),a>1&&null==d[0].offset&&(d[0].offset=0);for(var b=0,c=d[0].offset,e=1;e<a;e++){var f=d[e].offset;if(null!=f){for(var g=1;g<e-b;g++)d[b+g].offset=c+(f-c)*g/(e-b);b=e,c=f}}}if(null==b)return[];window.Symbol&&Symbol.iterator&&Array.prototype.from&&b[Symbol.iterator]&&(b=Array.from(b)),Array.isArray(b)||(b=f(b));for(var d=b.map(function(b){var c={};for(var d in b){var f=b[d];if("offset"==d){if(null!=f){if(f=Number(f),!isFinite(f))throw new TypeError("Keyframe offsets must be numbers.");if(f<0||f>1)throw new TypeError("Keyframe offsets must be between 0 and 1.")}}else if("composite"==d){if("add"==f||"accumulate"==f)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"add compositing is not supported"};if("replace"!=f)throw new TypeError("Invalid composite mode "+f+".")}else f="easing"==d?a.normalizeEasing(f):""+f;e(d,f,c)}return void 0==c.offset&&(c.offset=null),void 0==c.easing&&(c.easing="linear"),c}),g=!0,h=-(1/0),i=0;i<d.length;i++){var j=d[i].offset;if(null!=j){if(j<h)throw new TypeError("Keyframes are not loosely sorted by offset. Sort or specify offsets.");h=j}else g=!1}return d=d.filter(function(a){return a.offset>=0&&a.offset<=1}),g||c(),d}var h={background:["backgroundImage","backgroundPosition","backgroundSize","backgroundRepeat","backgroundAttachment","backgroundOrigin","backgroundClip","backgroundColor"],border:["borderTopColor","borderTopStyle","borderTopWidth","borderRightColor","borderRightStyle","borderRightWidth","borderBottomColor","borderBottomStyle","borderBottomWidth","borderLeftColor","borderLeftStyle","borderLeftWidth"],borderBottom:["borderBottomWidth","borderBottomStyle","borderBottomColor"],borderColor:["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"],borderLeft:["borderLeftWidth","borderLeftStyle","borderLeftColor"],borderRadius:["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],borderRight:["borderRightWidth","borderRightStyle","borderRightColor"],borderTop:["borderTopWidth","borderTopStyle","borderTopColor"],borderWidth:["borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth"],flex:["flexGrow","flexShrink","flexBasis"],font:["fontFamily","fontSize","fontStyle","fontVariant","fontWeight","lineHeight"],margin:["marginTop","marginRight","marginBottom","marginLeft"],outline:["outlineColor","outlineStyle","outlineWidth"],padding:["paddingTop","paddingRight","paddingBottom","paddingLeft"]},i=document.createElementNS("http://www.w3.org/1999/xhtml","div"),j={thin:"1px",medium:"3px",thick:"5px"},k={borderBottomWidth:j,borderLeftWidth:j,borderRightWidth:j,borderTopWidth:j,fontSize:{"xx-small":"60%","x-small":"75%",small:"89%",medium:"100%",large:"120%","x-large":"150%","xx-large":"200%"},fontWeight:{normal:"400",bold:"700"},outlineWidth:j,textShadow:{none:"0px 0px 0px transparent"},boxShadow:{none:"0px 0px 0px 0px transparent"}};a.convertToArrayForm=f,a.normalizeKeyframes=g}(c,f),function(a){var b={};a.isDeprecated=function(a,c,d,e){var f=e?"are":"is",g=new Date,h=new Date(c);return h.setMonth(h.getMonth()+3),!(g<h&&(a in b||console.warn("Web Animations: "+a+" "+f+" deprecated and will stop working on "+h.toDateString()+". "+d),b[a]=!0,1))},a.deprecated=function(b,c,d,e){var f=e?"are":"is";if(a.isDeprecated(b,c,d,e))throw new Error(b+" "+f+" no longer supported. "+d)}}(c),function(){if(document.documentElement.animate){var a=document.documentElement.animate([],0),b=!0;if(a&&(b=!1,"play|currentTime|pause|reverse|playbackRate|cancel|finish|startTime|playState".split("|").forEach(function(c){void 0===a[c]&&(b=!0)})),!b)return}!function(a,b,c){function d(a){for(var b={},c=0;c<a.length;c++)for(var d in a[c])if("offset"!=d&&"easing"!=d&&"composite"!=d){var e={offset:a[c].offset,easing:a[c].easing,value:a[c][d]};b[d]=b[d]||[],b[d].push(e)}for(var f in b){var g=b[f];if(0!=g[0].offset||1!=g[g.length-1].offset)throw{type:DOMException.NOT_SUPPORTED_ERR,name:"NotSupportedError",message:"Partial keyframes are not supported"}}return b}function e(c){var d=[];for(var e in c)for(var f=c[e],g=0;g<f.length-1;g++){var h=g,i=g+1,j=f[h].offset,k=f[i].offset,l=j,m=k;0==g&&(l=-(1/0),0==k&&(i=h)),g==f.length-2&&(m=1/0,1==j&&(h=i)),d.push({applyFrom:l,applyTo:m,startOffset:f[h].offset,endOffset:f[i].offset,easingFunction:a.parseEasingFunction(f[h].easing),property:e,interpolation:b.propertyInterpolation(e,f[h].value,f[i].value)})}return d.sort(function(a,b){return a.startOffset-b.startOffset}),d}b.convertEffectInput=function(c){var f=a.normalizeKeyframes(c),g=d(f),h=e(g);return function(a,c){if(null!=c)h.filter(function(a){return c>=a.applyFrom&&c<a.applyTo}).forEach(function(d){var e=c-d.startOffset,f=d.endOffset-d.startOffset,g=0==f?0:d.easingFunction(e/f);b.apply(a,d.property,d.interpolation(g))});else for(var d in g)"offset"!=d&&"easing"!=d&&"composite"!=d&&b.clear(a,d)}}}(c,d,f),function(a,b,c){function d(a){return a.replace(/-(.)/g,function(a,b){return b.toUpperCase()})}function e(a,b,c){h[c]=h[c]||[],h[c].push([a,b])}function f(a,b,c){for(var f=0;f<c.length;f++){var g=c[f];e(a,b,d(g))}}function g(c,e,f){var g=c;/-/.test(c)&&!a.isDeprecated("Hyphenated property names","2016-03-22","Use camelCase instead.",!0)&&(g=d(c)),"initial"!=e&&"initial"!=f||("initial"==e&&(e=i[g]),"initial"==f&&(f=i[g]));for(var j=e==f?[]:h[g],k=0;j&&k<j.length;k++){var l=j[k][0](e),m=j[k][0](f);if(void 0!==l&&void 0!==m){var n=j[k][1](l,m);if(n){var o=b.Interpolation.apply(null,n);return function(a){return 0==a?e:1==a?f:o(a)}}}}return b.Interpolation(!1,!0,function(a){return a?f:e})}var h={};b.addPropertiesHandler=f;var i={backgroundColor:"transparent",backgroundPosition:"0% 0%",borderBottomColor:"currentColor",borderBottomLeftRadius:"0px",borderBottomRightRadius:"0px",borderBottomWidth:"3px",borderLeftColor:"currentColor",borderLeftWidth:"3px",borderRightColor:"currentColor",borderRightWidth:"3px",borderSpacing:"2px",borderTopColor:"currentColor",borderTopLeftRadius:"0px",borderTopRightRadius:"0px",borderTopWidth:"3px",bottom:"auto",clip:"rect(0px, 0px, 0px, 0px)",color:"black",fontSize:"100%",fontWeight:"400",height:"auto",left:"auto",letterSpacing:"normal",lineHeight:"120%",marginBottom:"0px",marginLeft:"0px",marginRight:"0px",marginTop:"0px",maxHeight:"none",maxWidth:"none",minHeight:"0px",minWidth:"0px",opacity:"1.0",outlineColor:"invert",outlineOffset:"0px",outlineWidth:"3px",paddingBottom:"0px",paddingLeft:"0px",paddingRight:"0px",paddingTop:"0px",right:"auto",textIndent:"0px",textShadow:"0px 0px 0px transparent",top:"auto",transform:"",verticalAlign:"0px",visibility:"visible",width:"auto",wordSpacing:"normal",zIndex:"auto"};b.propertyInterpolation=g}(c,d,f),function(a,b,c){function d(b){var c=a.calculateActiveDuration(b),d=function(d){return a.calculateIterationProgress(c,d,b)};return d._totalDuration=b.delay+c+b.endDelay,d}b.KeyframeEffect=function(c,e,f,g){var h,i=d(a.normalizeTimingInput(f)),j=b.convertEffectInput(e),k=function(){j(c,h)};return k._update=function(a){return h=i(a),null!==h},k._clear=function(){j(c,null)},k._hasSameTarget=function(a){return c===a},k._target=c,k._totalDuration=i._totalDuration,k._id=g,k},b.NullEffect=function(a){var b=function(){a&&(a(),a=null)};return b._update=function(){return null},b._totalDuration=0,b._hasSameTarget=function(){return!1},b}}(c,d,f),function(a,b){a.apply=function(b,c,d){b.style[a.propertyName(c)]=d},a.clear=function(b,c){b.style[a.propertyName(c)]=""}}(d,f),function(a){window.Element.prototype.animate=function(b,c){var d="";return c&&c.id&&(d=c.id),a.timeline._play(a.KeyframeEffect(this,b,c,d))}}(d),function(a,b){function c(a,b,d){if("number"==typeof a&&"number"==typeof b)return a*(1-d)+b*d;if("boolean"==typeof a&&"boolean"==typeof b)return d<.5?a:b;if(a.length==b.length){for(var e=[],f=0;f<a.length;f++)e.push(c(a[f],b[f],d));return e}throw"Mismatched interpolation arguments "+a+":"+b}a.Interpolation=function(a,b,d){return function(e){return d(c(a,b,e))}}}(d,f),function(a,b,c){a.sequenceNumber=0;var d=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="finish",this.bubbles=!1,this.cancelable=!1,this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()};b.Animation=function(b){this.id="",b&&b._id&&(this.id=b._id),this._sequenceNumber=a.sequenceNumber++,this._currentTime=0,this._startTime=null,this._paused=!1,this._playbackRate=1,this._inTimeline=!0,this._finishedFlag=!0,this.onfinish=null,this._finishHandlers=[],this._effect=b,this._inEffect=this._effect._update(0),this._idle=!0,this._currentTimePending=!1},b.Animation.prototype={_ensureAlive:function(){this.playbackRate<0&&0===this.currentTime?this._inEffect=this._effect._update(-1):this._inEffect=this._effect._update(this.currentTime),this._inTimeline||!this._inEffect&&this._finishedFlag||(this._inTimeline=!0,b.timeline._animations.push(this))},_tickCurrentTime:function(a,b){a!=this._currentTime&&(this._currentTime=a,this._isFinished&&!b&&(this._currentTime=this._playbackRate>0?this._totalDuration:0),this._ensureAlive())},get currentTime(){return this._idle||this._currentTimePending?null:this._currentTime},set currentTime(a){a=+a,isNaN(a)||(b.restart(),this._paused||null==this._startTime||(this._startTime=this._timeline.currentTime-a/this._playbackRate),this._currentTimePending=!1,this._currentTime!=a&&(this._idle&&(this._idle=!1,this._paused=!0),this._tickCurrentTime(a,!0),b.applyDirtiedAnimation(this)))},get startTime(){return this._startTime},set startTime(a){a=+a,isNaN(a)||this._paused||this._idle||(this._startTime=a,this._tickCurrentTime((this._timeline.currentTime-this._startTime)*this.playbackRate),b.applyDirtiedAnimation(this))},get playbackRate(){return this._playbackRate},set playbackRate(a){if(a!=this._playbackRate){var c=this.currentTime;this._playbackRate=a,this._startTime=null,"paused"!=this.playState&&"idle"!=this.playState&&(this._finishedFlag=!1,this._idle=!1,this._ensureAlive(),b.applyDirtiedAnimation(this)),null!=c&&(this.currentTime=c)}},get _isFinished(){return!this._idle&&(this._playbackRate>0&&this._currentTime>=this._totalDuration||this._playbackRate<0&&this._currentTime<=0)},get _totalDuration(){return this._effect._totalDuration},get playState(){return this._idle?"idle":null==this._startTime&&!this._paused&&0!=this.playbackRate||this._currentTimePending?"pending":this._paused?"paused":this._isFinished?"finished":"running"},_rewind:function(){if(this._playbackRate>=0)this._currentTime=0;else{if(!(this._totalDuration<1/0))throw new DOMException("Unable to rewind negative playback rate animation with infinite duration","InvalidStateError");this._currentTime=this._totalDuration}},play:function(){this._paused=!1,(this._isFinished||this._idle)&&(this._rewind(),this._startTime=null),this._finishedFlag=!1,this._idle=!1,this._ensureAlive(),b.applyDirtiedAnimation(this)},pause:function(){this._isFinished||this._paused||this._idle?this._idle&&(this._rewind(),this._idle=!1):this._currentTimePending=!0,this._startTime=null,this._paused=!0},finish:function(){this._idle||(this.currentTime=this._playbackRate>0?this._totalDuration:0,this._startTime=this._totalDuration-this.currentTime,this._currentTimePending=!1,b.applyDirtiedAnimation(this))},cancel:function(){this._inEffect&&(this._inEffect=!1,this._idle=!0,this._paused=!1,this._isFinished=!0,this._finishedFlag=!0,this._currentTime=0,this._startTime=null,this._effect._update(null),b.applyDirtiedAnimation(this))},reverse:function(){this.playbackRate*=-1,this.play()},addEventListener:function(a,b){"function"==typeof b&&"finish"==a&&this._finishHandlers.push(b)},removeEventListener:function(a,b){if("finish"==a){var c=this._finishHandlers.indexOf(b);c>=0&&this._finishHandlers.splice(c,1)}},_fireEvents:function(a){if(this._isFinished){if(!this._finishedFlag){var b=new d(this,this._currentTime,a),c=this._finishHandlers.concat(this.onfinish?[this.onfinish]:[]);setTimeout(function(){c.forEach(function(a){a.call(b.target,b)})},0),this._finishedFlag=!0}}else this._finishedFlag=!1},_tick:function(a,b){this._idle||this._paused||(null==this._startTime?b&&(this.startTime=a-this._currentTime/this.playbackRate):this._isFinished||this._tickCurrentTime((a-this._startTime)*this.playbackRate)),b&&(this._currentTimePending=!1,this._fireEvents(a))},get _needsTick(){return this.playState in{pending:1,running:1}||!this._finishedFlag},_targetAnimations:function(){var a=this._effect._target;return a._activeAnimations||(a._activeAnimations=[]),a._activeAnimations},_markTarget:function(){var a=this._targetAnimations();a.indexOf(this)===-1&&a.push(this)},_unmarkTarget:function(){var a=this._targetAnimations(),b=a.indexOf(this);b!==-1&&a.splice(b,1)}}}(c,d,f),function(a,b,c){function d(a){var b=j;j=[],a<q.currentTime&&(a=q.currentTime),q._animations.sort(e),q._animations=h(a,!0,q._animations)[0],b.forEach(function(b){b[1](a)}),g(),l=void 0}function e(a,b){return a._sequenceNumber-b._sequenceNumber}function f(){this._animations=[],this.currentTime=window.performance&&performance.now?performance.now():0}function g(){o.forEach(function(a){a()}),o.length=0}function h(a,c,d){p=!0,n=!1;var e=b.timeline;e.currentTime=a,m=!1;var f=[],g=[],h=[],i=[];return d.forEach(function(b){b._tick(a,c),b._inEffect?(g.push(b._effect),b._markTarget()):(f.push(b._effect),b._unmarkTarget()),b._needsTick&&(m=!0);var d=b._inEffect||b._needsTick;b._inTimeline=d,d?h.push(b):i.push(b)}),o.push.apply(o,f),o.push.apply(o,g),m&&requestAnimationFrame(function(){}),p=!1,[h,i]}var i=window.requestAnimationFrame,j=[],k=0;window.requestAnimationFrame=function(a){var b=k++;return 0==j.length&&i(d),j.push([b,a]),b},window.cancelAnimationFrame=function(a){j.forEach(function(b){b[0]==a&&(b[1]=function(){})})},f.prototype={_play:function(c){c._timing=a.normalizeTimingInput(c.timing);var d=new b.Animation(c);return d._idle=!1,d._timeline=this,this._animations.push(d),b.restart(),b.applyDirtiedAnimation(d),d}};var l=void 0,m=!1,n=!1;b.restart=function(){return m||(m=!0,requestAnimationFrame(function(){}),n=!0),n},b.applyDirtiedAnimation=function(a){if(!p){a._markTarget();var c=a._targetAnimations();c.sort(e);var d=h(b.timeline.currentTime,!1,c.slice())[1];d.forEach(function(a){var b=q._animations.indexOf(a);b!==-1&&q._animations.splice(b,1)}),g()}};var o=[],p=!1,q=new f;b.timeline=q}(c,d,f),function(a){function b(a,b){var c=a.exec(b);if(c)return c=a.ignoreCase?c[0].toLowerCase():c[0],[c,b.substr(c.length)]}function c(a,b){b=b.replace(/^\s*/,"");var c=a(b);if(c)return[c[0],c[1].replace(/^\s*/,"")]}function d(a,d,e){a=c.bind(null,a);for(var f=[];;){var g=a(e);if(!g)return[f,e];if(f.push(g[0]),e=g[1],g=b(d,e),!g||""==g[1])return[f,e];e=g[1]}}function e(a,b){for(var c=0,d=0;d<b.length&&(!/\s|,/.test(b[d])||0!=c);d++)if("("==b[d])c++;else if(")"==b[d]&&(c--,0==c&&d++,c<=0))break;var e=a(b.substr(0,d));return void 0==e?void 0:[e,b.substr(d)]}function f(a,b){for(var c=a,d=b;c&&d;)c>d?c%=d:d%=c;return c=a*b/(c+d)}function g(a){return function(b){var c=a(b);return c&&(c[0]=void 0),c}}function h(a,b){return function(c){var d=a(c);return d?d:[b,c]}}function i(b,c){for(var d=[],e=0;e<b.length;e++){var f=a.consumeTrimmed(b[e],c);if(!f||""==f[0])return;void 0!==f[0]&&d.push(f[0]),c=f[1]}if(""==c)return d}function j(a,b,c,d,e){for(var g=[],h=[],i=[],j=f(d.length,e.length),k=0;k<j;k++){var l=b(d[k%d.length],e[k%e.length]);if(!l)return;g.push(l[0]),h.push(l[1]),i.push(l[2])}return[g,h,function(b){var d=b.map(function(a,b){return i[b](a)}).join(c);return a?a(d):d}]}function k(a,b,c){for(var d=[],e=[],f=[],g=0,h=0;h<c.length;h++)if("function"==typeof c[h]){var i=c[h](a[g],b[g++]);d.push(i[0]),e.push(i[1]),f.push(i[2])}else!function(a){d.push(!1),e.push(!1),f.push(function(){return c[a]})}(h);return[d,e,function(a){for(var b="",c=0;c<a.length;c++)b+=f[c](a[c]);return b}]}a.consumeToken=b,a.consumeTrimmed=c,a.consumeRepeated=d,a.consumeParenthesised=e,a.ignore=g,a.optional=h,a.consumeList=i,a.mergeNestedRepeated=j.bind(null,null),a.mergeWrappedNestedRepeated=j,a.mergeList=k}(d),function(a){function b(b){function c(b){var c=a.consumeToken(/^inset/i,b);if(c)return d.inset=!0,c;var c=a.consumeLengthOrPercent(b);if(c)return d.lengths.push(c[0]),c;var c=a.consumeColor(b);return c?(d.color=c[0],c):void 0}var d={inset:!1,lengths:[],color:null},e=a.consumeRepeated(c,/^/,b);if(e&&e[0].length)return[d,e[1]]}function c(c){var d=a.consumeRepeated(b,/^,/,c);if(d&&""==d[1])return d[0]}function d(b,c){for(;b.lengths.length<Math.max(b.lengths.length,c.lengths.length);)b.lengths.push({px:0});for(;c.lengths.length<Math.max(b.lengths.length,c.lengths.length);)c.lengths.push({px:0});if(b.inset==c.inset&&!!b.color==!!c.color){for(var d,e=[],f=[[],0],g=[[],0],h=0;h<b.lengths.length;h++){var i=a.mergeDimensions(b.lengths[h],c.lengths[h],2==h);f[0].push(i[0]),g[0].push(i[1]),e.push(i[2])}if(b.color&&c.color){var j=a.mergeColors(b.color,c.color);f[1]=j[0],g[1]=j[1],d=j[2]}return[f,g,function(a){for(var c=b.inset?"inset ":" ",f=0;f<e.length;f++)c+=e[f](a[0][f])+" ";return d&&(c+=d(a[1])),c}]}}function e(b,c,d,e){function f(a){return{inset:a,color:[0,0,0,0],lengths:[{px:0},{px:0},{px:0},{px:0}]}}for(var g=[],h=[],i=0;i<d.length||i<e.length;i++){var j=d[i]||f(e[i].inset),k=e[i]||f(d[i].inset);g.push(j),h.push(k)}return a.mergeNestedRepeated(b,c,g,h)}var f=e.bind(null,d,", ");a.addPropertiesHandler(c,f,["box-shadow","text-shadow"])}(d),function(a,b){function c(a){return a.toFixed(3).replace(".000","")}function d(a,b,c){return Math.min(b,Math.max(a,c))}function e(a){if(/^\s*[-+]?(\d*\.)?\d+\s*$/.test(a))return Number(a)}function f(a,b){return[a,b,c]}function g(a,b){if(0!=a)return i(0,1/0)(a,b)}function h(a,b){return[a,b,function(a){return Math.round(d(1,1/0,a))}]}function i(a,b){return function(e,f){return[e,f,function(e){return c(d(a,b,e))}]}}function j(a,b){return[a,b,Math.round]}a.clamp=d,a.addPropertiesHandler(e,i(0,1/0),["border-image-width","line-height"]),a.addPropertiesHandler(e,i(0,1),["opacity","shape-image-threshold"]),a.addPropertiesHandler(e,g,["flex-grow","flex-shrink"]),a.addPropertiesHandler(e,h,["orphans","widows"]),a.addPropertiesHandler(e,j,["z-index"]),a.parseNumber=e,a.mergeNumbers=f,a.numberToString=c}(d,f),function(a,b){function c(a,b){if("visible"==a||"visible"==b)return[0,1,function(c){return c<=0?a:c>=1?b:"visible"}]}a.addPropertiesHandler(String,c,["visibility"])}(d),function(a,b){function c(a){a=a.trim(),f.fillStyle="#000",f.fillStyle=a;var b=f.fillStyle;if(f.fillStyle="#fff",f.fillStyle=a,b==f.fillStyle){f.fillRect(0,0,1,1);var c=f.getImageData(0,0,1,1).data;f.clearRect(0,0,1,1);var d=c[3]/255;return[c[0]*d,c[1]*d,c[2]*d,d]}}function d(b,c){return[b,c,function(b){function c(a){return Math.max(0,Math.min(255,a))}if(b[3])for(var d=0;d<3;d++)b[d]=Math.round(c(b[d]/b[3]));return b[3]=a.numberToString(a.clamp(0,1,b[3])),"rgba("+b.join(",")+")"}]}var e=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");e.width=e.height=1;var f=e.getContext("2d");a.addPropertiesHandler(c,d,["background-color","border-bottom-color","border-left-color","border-right-color","border-top-color","color","outline-color","text-decoration-color"]),a.consumeColor=a.consumeParenthesised.bind(null,c),a.mergeColors=d}(d,f),function(a,b){function c(a,b){if(b=b.trim().toLowerCase(),"0"==b&&"px".search(a)>=0)return{px:0};if(/^[^(]*$|^calc/.test(b)){b=b.replace(/calc\(/g,"(");var c={};b=b.replace(a,function(a){return c[a]=null,"U"+a});for(var d="U("+a.source+")",e=b.replace(/[-+]?(\d*\.)?\d+/g,"N").replace(new RegExp("N"+d,"g"),"D").replace(/\s[+-]\s/g,"O").replace(/\s/g,""),f=[/N\*(D)/g,/(N|D)[*\/]N/g,/(N|D)O\1/g,/\((N|D)\)/g],g=0;g<f.length;)f[g].test(e)?(e=e.replace(f[g],"$1"),g=0):g++;if("D"==e){for(var h in c){var i=eval(b.replace(new RegExp("U"+h,"g"),"").replace(new RegExp(d,"g"),"*0"));if(!isFinite(i))return;c[h]=i}return c}}}function d(a,b){return e(a,b,!0)}function e(b,c,d){var e,f=[];for(e in b)f.push(e);for(e in c)f.indexOf(e)<0&&f.push(e);return b=f.map(function(a){return b[a]||0}),c=f.map(function(a){return c[a]||0}),[b,c,function(b){var c=b.map(function(c,e){return 1==b.length&&d&&(c=Math.max(c,0)),a.numberToString(c)+f[e]}).join(" + ");return b.length>1?"calc("+c+")":c}]}var f="px|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc",g=c.bind(null,new RegExp(f,"g")),h=c.bind(null,new RegExp(f+"|%","g")),i=c.bind(null,/deg|rad|grad|turn/g);a.parseLength=g,a.parseLengthOrPercent=h,a.consumeLengthOrPercent=a.consumeParenthesised.bind(null,h),a.parseAngle=i,a.mergeDimensions=e;var j=a.consumeParenthesised.bind(null,g),k=a.consumeRepeated.bind(void 0,j,/^/),l=a.consumeRepeated.bind(void 0,k,/^,/);a.consumeSizePairList=l;var m=function(a){var b=l(a);if(b&&""==b[1])return b[0]},n=a.mergeNestedRepeated.bind(void 0,d," "),o=a.mergeNestedRepeated.bind(void 0,n,",");a.mergeNonNegativeSizePair=n,a.addPropertiesHandler(m,o,["background-size"]),a.addPropertiesHandler(h,d,["border-bottom-width","border-image-width","border-left-width","border-right-width","border-top-width","flex-basis","font-size","height","line-height","max-height","max-width","outline-width","width"]),a.addPropertiesHandler(h,e,["border-bottom-left-radius","border-bottom-right-radius","border-top-left-radius","border-top-right-radius","bottom","left","letter-spacing","margin-bottom","margin-left","margin-right","margin-top","min-height","min-width","outline-offset","padding-bottom","padding-left","padding-right","padding-top","perspective","right","shape-margin","text-indent","top","vertical-align","word-spacing"])}(d,f),function(a,b){function c(b){return a.consumeLengthOrPercent(b)||a.consumeToken(/^auto/,b)}function d(b){var d=a.consumeList([a.ignore(a.consumeToken.bind(null,/^rect/)),a.ignore(a.consumeToken.bind(null,/^\(/)),a.consumeRepeated.bind(null,c,/^,/),a.ignore(a.consumeToken.bind(null,/^\)/))],b);if(d&&4==d[0].length)return d[0]}function e(b,c){return"auto"==b||"auto"==c?[!0,!1,function(d){var e=d?b:c;if("auto"==e)return"auto";var f=a.mergeDimensions(e,e);return f[2](f[0])}]:a.mergeDimensions(b,c)}function f(a){return"rect("+a+")"}var g=a.mergeWrappedNestedRepeated.bind(null,f,e,", ");a.parseBox=d,a.mergeBoxes=g,a.addPropertiesHandler(d,g,["clip"])}(d,f),function(a,b){function c(a){return function(b){var c=0;return a.map(function(a){return a===k?b[c++]:a})}}function d(a){return a}function e(b){if(b=b.toLowerCase().trim(),"none"==b)return[];for(var c,d=/\s*(\w+)\(([^)]*)\)/g,e=[],f=0;c=d.exec(b);){if(c.index!=f)return;f=c.index+c[0].length;var g=c[1],h=n[g];if(!h)return;var i=c[2].split(","),j=h[0];if(j.length<i.length)return;for(var k=[],o=0;o<j.length;o++){var p,q=i[o],r=j[o];if(p=q?{A:function(b){return"0"==b.trim()?m:a.parseAngle(b)},N:a.parseNumber,T:a.parseLengthOrPercent,L:a.parseLength}[r.toUpperCase()](q):{a:m,n:k[0],t:l}[r],void 0===p)return;k.push(p)}if(e.push({t:g,d:k}),d.lastIndex==b.length)return e}}function f(a){return a.toFixed(6).replace(".000000","")}function g(b,c){if(b.decompositionPair!==c){b.decompositionPair=c;var d=a.makeMatrixDecomposition(b)}if(c.decompositionPair!==b){c.decompositionPair=b;var e=a.makeMatrixDecomposition(c)}return null==d[0]||null==e[0]?[[!1],[!0],function(a){return a?c[0].d:b[0].d}]:(d[0].push(0),e[0].push(1),[d,e,function(b){var c=a.quat(d[0][3],e[0][3],b[5]),g=a.composeMatrix(b[0],b[1],b[2],c,b[4]),h=g.map(f).join(",");return h}])}function h(a){return a.replace(/[xy]/,"")}function i(a){return a.replace(/(x|y|z|3d)?$/,"3d")}function j(b,c){var d=a.makeMatrixDecomposition&&!0,e=!1;if(!b.length||!c.length){b.length||(e=!0,b=c,c=[]);for(var f=0;f<b.length;f++){var j=b[f].t,k=b[f].d,l="scale"==j.substr(0,5)?1:0;c.push({t:j,d:k.map(function(a){if("number"==typeof a)return l;var b={};for(var c in a)b[c]=l;return b})})}}var m=function(a,b){return"perspective"==a&&"perspective"==b||("matrix"==a||"matrix3d"==a)&&("matrix"==b||"matrix3d"==b)},o=[],p=[],q=[];if(b.length!=c.length){if(!d)return;var r=g(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]]}else for(var f=0;f<b.length;f++){var j,s=b[f].t,t=c[f].t,u=b[f].d,v=c[f].d,w=n[s],x=n[t];if(m(s,t)){if(!d)return;var r=g([b[f]],[c[f]]);o.push(r[0]),p.push(r[1]),q.push(["matrix",[r[2]]])}else{if(s==t)j=s;else if(w[2]&&x[2]&&h(s)==h(t))j=h(s),u=w[2](u),v=x[2](v);else{if(!w[1]||!x[1]||i(s)!=i(t)){if(!d)return;var r=g(b,c);o=[r[0]],p=[r[1]],q=[["matrix",[r[2]]]];break}j=i(s),u=w[1](u),v=x[1](v)}for(var y=[],z=[],A=[],B=0;B<u.length;B++){var C="number"==typeof u[B]?a.mergeNumbers:a.mergeDimensions,r=C(u[B],v[B]);y[B]=r[0],z[B]=r[1],A.push(r[2])}o.push(y),p.push(z),q.push([j,A])}}if(e){var D=o;o=p,p=D}return[o,p,function(a){return a.map(function(a,b){var c=a.map(function(a,c){return q[b][1][c](a)}).join(",");return"matrix"==q[b][0]&&16==c.split(",").length&&(q[b][0]="matrix3d"),q[b][0]+"("+c+")"}).join(" ")}]}var k=null,l={px:0},m={deg:0},n={matrix:["NNNNNN",[k,k,0,0,k,k,0,0,0,0,1,0,k,k,0,1],d],matrix3d:["NNNNNNNNNNNNNNNN",d],rotate:["A"],rotatex:["A"],rotatey:["A"],rotatez:["A"],rotate3d:["NNNA"],perspective:["L"],scale:["Nn",c([k,k,1]),d],scalex:["N",c([k,1,1]),c([k,1])],scaley:["N",c([1,k,1]),c([1,k])],scalez:["N",c([1,1,k])],scale3d:["NNN",d],skew:["Aa",null,d],skewx:["A",null,c([k,m])],skewy:["A",null,c([m,k])],translate:["Tt",c([k,k,l]),d],translatex:["T",c([k,l,l]),c([k,l])],translatey:["T",c([l,k,l]),c([l,k])],translatez:["L",c([l,l,k])],translate3d:["TTL",d]};a.addPropertiesHandler(e,j,["transform"])}(d,f),function(a,b){function c(a,b){b.concat([a]).forEach(function(b){b in document.documentElement.style&&(d[a]=b)})}var d={};c("transform",["webkitTransform","msTransform"]),c("transformOrigin",["webkitTransformOrigin"]),c("perspective",["webkitPerspective"]),c("perspectiveOrigin",["webkitPerspectiveOrigin"]),a.propertyName=function(a){return d[a]||a}}(d,f)}(),!function(){if(void 0===document.createElement("div").animate([]).oncancel){var a;if(window.performance&&performance.now)var a=function(){return performance.now()};else var a=function(){return Date.now()};var b=function(a,b,c){this.target=a,this.currentTime=b,this.timelineTime=c,this.type="cancel",this.bubbles=!1,this.cancelable=!1,
this.currentTarget=a,this.defaultPrevented=!1,this.eventPhase=Event.AT_TARGET,this.timeStamp=Date.now()},c=window.Element.prototype.animate;window.Element.prototype.animate=function(d,e){var f=c.call(this,d,e);f._cancelHandlers=[],f.oncancel=null;var g=f.cancel;f.cancel=function(){g.call(this);var c=new b(this,null,a()),d=this._cancelHandlers.concat(this.oncancel?[this.oncancel]:[]);setTimeout(function(){d.forEach(function(a){a.call(c.target,c)})},0)};var h=f.addEventListener;f.addEventListener=function(a,b){"function"==typeof b&&"cancel"==a?this._cancelHandlers.push(b):h.call(this,a,b)};var i=f.removeEventListener;return f.removeEventListener=function(a,b){if("cancel"==a){var c=this._cancelHandlers.indexOf(b);c>=0&&this._cancelHandlers.splice(c,1)}else i.call(this,a,b)},f}}}(),function(a){var b=document.documentElement,c=null,d=!1;try{var e=getComputedStyle(b).getPropertyValue("opacity"),f="0"==e?"1":"0";c=b.animate({opacity:[f,f]},{duration:1}),c.currentTime=0,d=getComputedStyle(b).getPropertyValue("opacity")==f}catch(a){}finally{c&&c.cancel()}if(!d){var g=window.Element.prototype.animate;window.Element.prototype.animate=function(b,c){return window.Symbol&&Symbol.iterator&&Array.prototype.from&&b[Symbol.iterator]&&(b=Array.from(b)),Array.isArray(b)||null===b||(b=a.convertToArrayForm(b)),g.call(this,b,c)}}}(c),!function(a,b,c){function d(a){var c=b.timeline;c.currentTime=a,c._discardAnimations(),0==c._animations.length?f=!1:requestAnimationFrame(d)}var e=window.requestAnimationFrame;window.requestAnimationFrame=function(a){return e(function(c){b.timeline._updateAnimationsPromises(),a(c),b.timeline._updateAnimationsPromises()})},b.AnimationTimeline=function(){this._animations=[],this.currentTime=void 0},b.AnimationTimeline.prototype={getAnimations:function(){return this._discardAnimations(),this._animations.slice()},_updateAnimationsPromises:function(){b.animationsWithPromises=b.animationsWithPromises.filter(function(a){return a._updatePromises()})},_discardAnimations:function(){this._updateAnimationsPromises(),this._animations=this._animations.filter(function(a){return"finished"!=a.playState&&"idle"!=a.playState})},_play:function(a){var c=new b.Animation(a,this);return this._animations.push(c),b.restartWebAnimationsNextTick(),c._updatePromises(),c._animation.play(),c._updatePromises(),c},play:function(a){return a&&a.remove(),this._play(a)}};var f=!1;b.restartWebAnimationsNextTick=function(){f||(f=!0,requestAnimationFrame(d))};var g=new b.AnimationTimeline;b.timeline=g;try{Object.defineProperty(window.document,"timeline",{configurable:!0,get:function(){return g}})}catch(a){}try{window.document.timeline=g}catch(a){}}(c,e,f),function(a,b,c){b.animationsWithPromises=[],b.Animation=function(b,c){if(this.id="",b&&b._id&&(this.id=b._id),this.effect=b,b&&(b._animation=this),!c)throw new Error("Animation with null timeline is not supported");this._timeline=c,this._sequenceNumber=a.sequenceNumber++,this._holdTime=0,this._paused=!1,this._isGroup=!1,this._animation=null,this._childAnimations=[],this._callback=null,this._oldPlayState="idle",this._rebuildUnderlyingAnimation(),this._animation.cancel(),this._updatePromises()},b.Animation.prototype={_updatePromises:function(){var a=this._oldPlayState,b=this.playState;return this._readyPromise&&b!==a&&("idle"==b?(this._rejectReadyPromise(),this._readyPromise=void 0):"pending"==a?this._resolveReadyPromise():"pending"==b&&(this._readyPromise=void 0)),this._finishedPromise&&b!==a&&("idle"==b?(this._rejectFinishedPromise(),this._finishedPromise=void 0):"finished"==b?this._resolveFinishedPromise():"finished"==a&&(this._finishedPromise=void 0)),this._oldPlayState=this.playState,this._readyPromise||this._finishedPromise},_rebuildUnderlyingAnimation:function(){this._updatePromises();var a,c,d,e,f=!!this._animation;f&&(a=this.playbackRate,c=this._paused,d=this.startTime,e=this.currentTime,this._animation.cancel(),this._animation._wrapper=null,this._animation=null),(!this.effect||this.effect instanceof window.KeyframeEffect)&&(this._animation=b.newUnderlyingAnimationForKeyframeEffect(this.effect),b.bindAnimationForKeyframeEffect(this)),(this.effect instanceof window.SequenceEffect||this.effect instanceof window.GroupEffect)&&(this._animation=b.newUnderlyingAnimationForGroup(this.effect),b.bindAnimationForGroup(this)),this.effect&&this.effect._onsample&&b.bindAnimationForCustomEffect(this),f&&(1!=a&&(this.playbackRate=a),null!==d?this.startTime=d:null!==e?this.currentTime=e:null!==this._holdTime&&(this.currentTime=this._holdTime),c&&this.pause()),this._updatePromises()},_updateChildren:function(){if(this.effect&&"idle"!=this.playState){var a=this.effect._timing.delay;this._childAnimations.forEach(function(c){this._arrangeChildren(c,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c.effect))}.bind(this))}},_setExternalAnimation:function(a){if(this.effect&&this._isGroup)for(var b=0;b<this.effect.children.length;b++)this.effect.children[b]._animation=a,this._childAnimations[b]._setExternalAnimation(a)},_constructChildAnimations:function(){if(this.effect&&this._isGroup){var a=this.effect._timing.delay;this._removeChildAnimations(),this.effect.children.forEach(function(c){var d=b.timeline._play(c);this._childAnimations.push(d),d.playbackRate=this.playbackRate,this._paused&&d.pause(),c._animation=this.effect._animation,this._arrangeChildren(d,a),this.effect instanceof window.SequenceEffect&&(a+=b.groupChildDuration(c))}.bind(this))}},_arrangeChildren:function(a,b){null===this.startTime?a.currentTime=this.currentTime-b/this.playbackRate:a.startTime!==this.startTime+b/this.playbackRate&&(a.startTime=this.startTime+b/this.playbackRate)},get timeline(){return this._timeline},get playState(){return this._animation?this._animation.playState:"idle"},get finished(){return window.Promise?(this._finishedPromise||(b.animationsWithPromises.indexOf(this)==-1&&b.animationsWithPromises.push(this),this._finishedPromise=new Promise(function(a,b){this._resolveFinishedPromise=function(){a(this)},this._rejectFinishedPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"finished"==this.playState&&this._resolveFinishedPromise()),this._finishedPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get ready(){return window.Promise?(this._readyPromise||(b.animationsWithPromises.indexOf(this)==-1&&b.animationsWithPromises.push(this),this._readyPromise=new Promise(function(a,b){this._resolveReadyPromise=function(){a(this)},this._rejectReadyPromise=function(){b({type:DOMException.ABORT_ERR,name:"AbortError"})}}.bind(this)),"pending"!==this.playState&&this._resolveReadyPromise()),this._readyPromise):(console.warn("Animation Promises require JavaScript Promise constructor"),null)},get onfinish(){return this._animation.onfinish},set onfinish(a){"function"==typeof a?this._animation.onfinish=function(b){b.target=this,a.call(this,b)}.bind(this):this._animation.onfinish=a},get oncancel(){return this._animation.oncancel},set oncancel(a){"function"==typeof a?this._animation.oncancel=function(b){b.target=this,a.call(this,b)}.bind(this):this._animation.oncancel=a},get currentTime(){this._updatePromises();var a=this._animation.currentTime;return this._updatePromises(),a},set currentTime(a){this._updatePromises(),this._animation.currentTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.currentTime=a-c}),this._updatePromises()},get startTime(){return this._animation.startTime},set startTime(a){this._updatePromises(),this._animation.startTime=isFinite(a)?a:Math.sign(a)*Number.MAX_VALUE,this._register(),this._forEachChild(function(b,c){b.startTime=a+c}),this._updatePromises()},get playbackRate(){return this._animation.playbackRate},set playbackRate(a){this._updatePromises();var b=this.currentTime;this._animation.playbackRate=a,this._forEachChild(function(b){b.playbackRate=a}),null!==b&&(this.currentTime=b),this._updatePromises()},play:function(){this._updatePromises(),this._paused=!1,this._animation.play(),this._timeline._animations.indexOf(this)==-1&&this._timeline._animations.push(this),this._register(),b.awaitStartTime(this),this._forEachChild(function(a){var b=a.currentTime;a.play(),a.currentTime=b}),this._updatePromises()},pause:function(){this._updatePromises(),this.currentTime&&(this._holdTime=this.currentTime),this._animation.pause(),this._register(),this._forEachChild(function(a){a.pause()}),this._paused=!0,this._updatePromises()},finish:function(){this._updatePromises(),this._animation.finish(),this._register(),this._updatePromises()},cancel:function(){this._updatePromises(),this._animation.cancel(),this._register(),this._removeChildAnimations(),this._updatePromises()},reverse:function(){this._updatePromises();var a=this.currentTime;this._animation.reverse(),this._forEachChild(function(a){a.reverse()}),null!==a&&(this.currentTime=a),this._updatePromises()},addEventListener:function(a,b){var c=b;"function"==typeof b&&(c=function(a){a.target=this,b.call(this,a)}.bind(this),b._wrapper=c),this._animation.addEventListener(a,c)},removeEventListener:function(a,b){this._animation.removeEventListener(a,b&&b._wrapper||b)},_removeChildAnimations:function(){for(;this._childAnimations.length;)this._childAnimations.pop().cancel()},_forEachChild:function(b){var c=0;if(this.effect.children&&this._childAnimations.length<this.effect.children.length&&this._constructChildAnimations(),this._childAnimations.forEach(function(a){b.call(this,a,c),this.effect instanceof window.SequenceEffect&&(c+=a.effect.activeDuration)}.bind(this)),"pending"!=this.playState){var d=this.effect._timing,e=this.currentTime;null!==e&&(e=a.calculateIterationProgress(a.calculateActiveDuration(d),e,d)),(null==e||isNaN(e))&&this._removeChildAnimations()}}},window.Animation=b.Animation}(c,e,f),function(a,b,c){function d(b){this._frames=a.normalizeKeyframes(b)}function e(){for(var a=!1;i.length;){var b=i.shift();b._updateChildren(),a=!0}return a}var f=function(a){if(a._animation=void 0,a instanceof window.SequenceEffect||a instanceof window.GroupEffect)for(var b=0;b<a.children.length;b++)f(a.children[b])};b.removeMulti=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c];d._parent?(b.indexOf(d._parent)==-1&&b.push(d._parent),d._parent.children.splice(d._parent.children.indexOf(d),1),d._parent=null,f(d)):d._animation&&d._animation.effect==d&&(d._animation.cancel(),d._animation.effect=new KeyframeEffect(null,[]),d._animation._callback&&(d._animation._callback._animation=null),d._animation._rebuildUnderlyingAnimation(),f(d))}for(c=0;c<b.length;c++)b[c]._rebuild()},b.KeyframeEffect=function(b,c,e,f){return this.target=b,this._parent=null,e=a.numericTimingToObject(e),this._timingInput=a.cloneTimingInput(e),this._timing=a.normalizeTimingInput(e),this.timing=a.makeTiming(e,!1,this),this.timing._effect=this,"function"==typeof c?(a.deprecated("Custom KeyframeEffect","2015-06-22","Use KeyframeEffect.onsample instead."),this._normalizedKeyframes=c):this._normalizedKeyframes=new d(c),this._keyframes=c,this.activeDuration=a.calculateActiveDuration(this._timing),this._id=f,this},b.KeyframeEffect.prototype={getFrames:function(){return"function"==typeof this._normalizedKeyframes?this._normalizedKeyframes:this._normalizedKeyframes._frames},set onsample(a){if("function"==typeof this.getFrames())throw new Error("Setting onsample on custom effect KeyframeEffect is not supported.");this._onsample=a,this._animation&&this._animation._rebuildUnderlyingAnimation()},get parent(){return this._parent},clone:function(){if("function"==typeof this.getFrames())throw new Error("Cloning custom effects is not supported.");var b=new KeyframeEffect(this.target,[],a.cloneTimingInput(this._timingInput),this._id);return b._normalizedKeyframes=this._normalizedKeyframes,b._keyframes=this._keyframes,b},remove:function(){b.removeMulti([this])}};var g=Element.prototype.animate;Element.prototype.animate=function(a,c){var d="";return c&&c.id&&(d=c.id),b.timeline._play(new b.KeyframeEffect(this,a,c,d))};var h=document.createElementNS("http://www.w3.org/1999/xhtml","div");b.newUnderlyingAnimationForKeyframeEffect=function(a){if(a){var b=a.target||h,c=a._keyframes;"function"==typeof c&&(c=[]);var d=a._timingInput;d.id=a._id}else var b=h,c=[],d=0;return g.apply(b,[c,d])},b.bindAnimationForKeyframeEffect=function(a){a.effect&&"function"==typeof a.effect._normalizedKeyframes&&b.bindAnimationForCustomEffect(a)};var i=[];b.awaitStartTime=function(a){null===a.startTime&&a._isGroup&&(0==i.length&&requestAnimationFrame(e),i.push(a))};var j=window.getComputedStyle;Object.defineProperty(window,"getComputedStyle",{configurable:!0,enumerable:!0,value:function(){b.timeline._updateAnimationsPromises();var a=j.apply(this,arguments);return e()&&(a=j.apply(this,arguments)),b.timeline._updateAnimationsPromises(),a}}),window.KeyframeEffect=b.KeyframeEffect,window.Element.prototype.getAnimations=function(){return document.timeline.getAnimations().filter(function(a){return null!==a.effect&&a.effect.target==this}.bind(this))}}(c,e,f),function(a,b,c){function d(a){a._registered||(a._registered=!0,g.push(a),h||(h=!0,requestAnimationFrame(e)))}function e(a){var b=g;g=[],b.sort(function(a,b){return a._sequenceNumber-b._sequenceNumber}),b=b.filter(function(a){a();var b=a._animation?a._animation.playState:"idle";return"running"!=b&&"pending"!=b&&(a._registered=!1),a._registered}),g.push.apply(g,b),g.length?(h=!0,requestAnimationFrame(e)):h=!1}var f=(document.createElementNS("http://www.w3.org/1999/xhtml","div"),0);b.bindAnimationForCustomEffect=function(b){var c,e=b.effect.target,g="function"==typeof b.effect.getFrames();c=g?b.effect.getFrames():b.effect._onsample;var h=b.effect.timing,i=null;h=a.normalizeTimingInput(h);var j=function(){var d=j._animation?j._animation.currentTime:null;null!==d&&(d=a.calculateIterationProgress(a.calculateActiveDuration(h),d,h),isNaN(d)&&(d=null)),d!==i&&(g?c(d,e,b.effect):c(d,b.effect,b.effect._animation)),i=d};j._animation=b,j._registered=!1,j._sequenceNumber=f++,b._callback=j,d(j)};var g=[],h=!1;b.Animation.prototype._register=function(){this._callback&&d(this._callback)}}(c,e,f),function(a,b,c){function d(a){return a._timing.delay+a.activeDuration+a._timing.endDelay}function e(b,c,d){this._id=d,this._parent=null,this.children=b||[],this._reparent(this.children),c=a.numericTimingToObject(c),this._timingInput=a.cloneTimingInput(c),this._timing=a.normalizeTimingInput(c,!0),this.timing=a.makeTiming(c,!0,this),this.timing._effect=this,"auto"===this._timing.duration&&(this._timing.duration=this.activeDuration)}window.SequenceEffect=function(){e.apply(this,arguments)},window.GroupEffect=function(){e.apply(this,arguments)},e.prototype={_isAncestor:function(a){for(var b=this;null!==b;){if(b==a)return!0;b=b._parent}return!1},_rebuild:function(){for(var a=this;a;)"auto"===a.timing.duration&&(a._timing.duration=a.activeDuration),a=a._parent;this._animation&&this._animation._rebuildUnderlyingAnimation()},_reparent:function(a){b.removeMulti(a);for(var c=0;c<a.length;c++)a[c]._parent=this},_putChild:function(a,b){for(var c=b?"Cannot append an ancestor or self":"Cannot prepend an ancestor or self",d=0;d<a.length;d++)if(this._isAncestor(a[d]))throw{type:DOMException.HIERARCHY_REQUEST_ERR,name:"HierarchyRequestError",message:c};for(var d=0;d<a.length;d++)b?this.children.push(a[d]):this.children.unshift(a[d]);this._reparent(a),this._rebuild()},append:function(){this._putChild(arguments,!0)},prepend:function(){this._putChild(arguments,!1)},get parent(){return this._parent},get firstChild(){return this.children.length?this.children[0]:null},get lastChild(){return this.children.length?this.children[this.children.length-1]:null},clone:function(){for(var b=a.cloneTimingInput(this._timingInput),c=[],d=0;d<this.children.length;d++)c.push(this.children[d].clone());return this instanceof GroupEffect?new GroupEffect(c,b):new SequenceEffect(c,b)},remove:function(){b.removeMulti([this])}},window.SequenceEffect.prototype=Object.create(e.prototype),Object.defineProperty(window.SequenceEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a+=d(b)}),Math.max(a,0)}}),window.GroupEffect.prototype=Object.create(e.prototype),Object.defineProperty(window.GroupEffect.prototype,"activeDuration",{get:function(){var a=0;return this.children.forEach(function(b){a=Math.max(a,d(b))}),a}}),b.newUnderlyingAnimationForGroup=function(c){var d,e=null,f=function(b){var c=d._wrapper;if(c&&"pending"!=c.playState&&c.effect)return null==b?void c._removeChildAnimations():0==b&&c.playbackRate<0&&(e||(e=a.normalizeTimingInput(c.effect.timing)),b=a.calculateIterationProgress(a.calculateActiveDuration(e),-1,e),isNaN(b)||null==b)?(c._forEachChild(function(a){a.currentTime=-1}),void c._removeChildAnimations()):void 0},g=new KeyframeEffect(null,[],c._timing,c._id);return g.onsample=f,d=b.timeline._play(g)},b.bindAnimationForGroup=function(a){a._animation._wrapper=a,a._isGroup=!0,b.awaitStartTime(a),a._constructChildAnimations(),a._setExternalAnimation(a)},b.groupChildDuration=d}(c,e,f),b.true=a}({},function(){return this}());
//# sourceMappingURL=web-animations-next-lite.min.js.map
Polymer({

    is: 'opaque-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      node.style.opacity = '0';
      return this._effect;
    },

    complete: function(config) {
      config.node.style.opacity = '';
    }

  });
(function() {
    'use strict';
    /**
     * Used to calculate the scroll direction during touch events.
     * @type {!Object}
     */
    var lastTouchPosition = {
      pageX: 0,
      pageY: 0
    };
    /**
     * Used to avoid computing event.path and filter scrollable nodes (better perf).
     * @type {?EventTarget}
     */
    var lastRootTarget = null;
    /**
     * @type {!Array<Node>}
     */
    var lastScrollableNodes = [];

    /**
     * The IronDropdownScrollManager is intended to provide a central source
     * of authority and control over which elements in a document are currently
     * allowed to scroll.
     */

    Polymer.IronDropdownScrollManager = {

      /**
       * The current element that defines the DOM boundaries of the
       * scroll lock. This is always the most recently locking element.
       */
      get currentLockingElement() {
        return this._lockingElements[this._lockingElements.length - 1];
      },

      /**
       * Returns true if the provided element is "scroll locked", which is to
       * say that it cannot be scrolled via pointer or keyboard interactions.
       *
       * @param {HTMLElement} element An HTML element instance which may or may
       * not be scroll locked.
       */
      elementIsScrollLocked: function(element) {
        var currentLockingElement = this.currentLockingElement;

        if (currentLockingElement === undefined)
          return false;

        var scrollLocked;

        if (this._hasCachedLockedElement(element)) {
          return true;
        }

        if (this._hasCachedUnlockedElement(element)) {
          return false;
        }

        scrollLocked = !!currentLockingElement &&
          currentLockingElement !== element &&
          !this._composedTreeContains(currentLockingElement, element);

        if (scrollLocked) {
          this._lockedElementCache.push(element);
        } else {
          this._unlockedElementCache.push(element);
        }

        return scrollLocked;
      },

      /**
       * Push an element onto the current scroll lock stack. The most recently
       * pushed element and its children will be considered scrollable. All
       * other elements will not be scrollable.
       *
       * Scroll locking is implemented as a stack so that cases such as
       * dropdowns within dropdowns are handled well.
       *
       * @param {HTMLElement} element The element that should lock scroll.
       */
      pushScrollLock: function(element) {
        // Prevent pushing the same element twice
        if (this._lockingElements.indexOf(element) >= 0) {
          return;
        }

        if (this._lockingElements.length === 0) {
          this._lockScrollInteractions();
        }

        this._lockingElements.push(element);

        this._lockedElementCache = [];
        this._unlockedElementCache = [];
      },

      /**
       * Remove an element from the scroll lock stack. The element being
       * removed does not need to be the most recently pushed element. However,
       * the scroll lock constraints only change when the most recently pushed
       * element is removed.
       *
       * @param {HTMLElement} element The element to remove from the scroll
       * lock stack.
       */
      removeScrollLock: function(element) {
        var index = this._lockingElements.indexOf(element);

        if (index === -1) {
          return;
        }

        this._lockingElements.splice(index, 1);

        this._lockedElementCache = [];
        this._unlockedElementCache = [];

        if (this._lockingElements.length === 0) {
          this._unlockScrollInteractions();
        }
      },

      _lockingElements: [],

      _lockedElementCache: null,

      _unlockedElementCache: null,

      _hasCachedLockedElement: function(element) {
        return this._lockedElementCache.indexOf(element) > -1;
      },

      _hasCachedUnlockedElement: function(element) {
        return this._unlockedElementCache.indexOf(element) > -1;
      },

      _composedTreeContains: function(element, child) {
        // NOTE(cdata): This method iterates over content elements and their
        // corresponding distributed nodes to implement a contains-like method
        // that pierces through the composed tree of the ShadowDOM. Results of
        // this operation are cached (elsewhere) on a per-scroll-lock basis, to
        // guard against potentially expensive lookups happening repeatedly as
        // a user scrolls / touchmoves.
        var contentElements;
        var distributedNodes;
        var contentIndex;
        var nodeIndex;

        if (element.contains(child)) {
          return true;
        }

        contentElements = Polymer.dom(element).querySelectorAll('content');

        for (contentIndex = 0; contentIndex < contentElements.length; ++contentIndex) {

          distributedNodes = Polymer.dom(contentElements[contentIndex]).getDistributedNodes();

          for (nodeIndex = 0; nodeIndex < distributedNodes.length; ++nodeIndex) {

            if (this._composedTreeContains(distributedNodes[nodeIndex], child)) {
              return true;
            }
          }
        }

        return false;
      },

      _scrollInteractionHandler: function(event) {
        // Avoid canceling an event with cancelable=false, e.g. scrolling is in
        // progress and cannot be interrupted.
        if (event.cancelable && this._shouldPreventScrolling(event)) {
          event.preventDefault();
        }
        // If event has targetTouches (touch event), update last touch position.
        if (event.targetTouches) {
          var touch = event.targetTouches[0];
          lastTouchPosition.pageX = touch.pageX;
          lastTouchPosition.pageY = touch.pageY;
        }
      },

      _lockScrollInteractions: function() {
        this._boundScrollHandler = this._boundScrollHandler ||
          this._scrollInteractionHandler.bind(this);
        // Modern `wheel` event for mouse wheel scrolling:
        document.addEventListener('wheel', this._boundScrollHandler, true);
        // Older, non-standard `mousewheel` event for some FF:
        document.addEventListener('mousewheel', this._boundScrollHandler, true);
        // IE:
        document.addEventListener('DOMMouseScroll', this._boundScrollHandler, true);
        // Save the lastScrollableNodes on touchstart, to be used on touchmove.
        document.addEventListener('touchstart', this._boundScrollHandler, true);
        // Mobile devices can scroll on touch move:
        document.addEventListener('touchmove', this._boundScrollHandler, true);
      },

      _unlockScrollInteractions: function() {
        document.removeEventListener('wheel', this._boundScrollHandler, true);
        document.removeEventListener('mousewheel', this._boundScrollHandler, true);
        document.removeEventListener('DOMMouseScroll', this._boundScrollHandler, true);
        document.removeEventListener('touchstart', this._boundScrollHandler, true);
        document.removeEventListener('touchmove', this._boundScrollHandler, true);
      },

      /**
       * Returns true if the event causes scroll outside the current locking
       * element, e.g. pointer/keyboard interactions, or scroll "leaking"
       * outside the locking element when it is already at its scroll boundaries.
       * @param {!Event} event
       * @return {boolean}
       * @private
       */
      _shouldPreventScrolling: function(event) {

        // Update if root target changed. For touch events, ensure we don't
        // update during touchmove.
        var target = Polymer.dom(event).rootTarget;
        if (event.type !== 'touchmove' && lastRootTarget !== target) {
          lastRootTarget = target;
          lastScrollableNodes = this._getScrollableNodes(Polymer.dom(event).path);
        }

        // Prevent event if no scrollable nodes.
        if (!lastScrollableNodes.length) {
          return true;
        }
        // Don't prevent touchstart event inside the locking element when it has
        // scrollable nodes.
        if (event.type === 'touchstart') {
          return false;
        }
        // Get deltaX/Y.
        var info = this._getScrollInfo(event);
        // Prevent if there is no child that can scroll.
        return !this._getScrollingNode(lastScrollableNodes, info.deltaX, info.deltaY);
      },

      /**
       * Returns an array of scrollable nodes up to the current locking element,
       * which is included too if scrollable.
       * @param {!Array<Node>} nodes
       * @return {Array<Node>} scrollables
       * @private
       */
      _getScrollableNodes: function(nodes) {
        var scrollables = [];
        var lockingIndex = nodes.indexOf(this.currentLockingElement);
        // Loop from root target to locking element (included).
        for (var i = 0; i <= lockingIndex; i++) {
          // Skip non-Element nodes.
          if (nodes[i].nodeType !== Node.ELEMENT_NODE) {
            continue;
          }
          var node = /** @type {!Element} */ (nodes[i]);
          // Check inline style before checking computed style.
          var style = node.style;
          if (style.overflow !== 'scroll' && style.overflow !== 'auto') {
            style = window.getComputedStyle(node);
          }
          if (style.overflow === 'scroll' || style.overflow === 'auto') {
            scrollables.push(node);
          }
        }
        return scrollables;
      },

      /**
       * Returns the node that is scrolling. If there is no scrolling,
       * returns undefined.
       * @param {!Array<Node>} nodes
       * @param {number} deltaX Scroll delta on the x-axis
       * @param {number} deltaY Scroll delta on the y-axis
       * @return {Node|undefined}
       * @private
       */
      _getScrollingNode: function(nodes, deltaX, deltaY) {
        // No scroll.
        if (!deltaX && !deltaY) {
          return;
        }
        // Check only one axis according to where there is more scroll.
        // Prefer vertical to horizontal.
        var verticalScroll = Math.abs(deltaY) >= Math.abs(deltaX);
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var canScroll = false;
          if (verticalScroll) {
            // delta < 0 is scroll up, delta > 0 is scroll down.
            canScroll = deltaY < 0 ? node.scrollTop > 0 :
              node.scrollTop < node.scrollHeight - node.clientHeight;
          } else {
            // delta < 0 is scroll left, delta > 0 is scroll right.
            canScroll = deltaX < 0 ? node.scrollLeft > 0 :
              node.scrollLeft < node.scrollWidth - node.clientWidth;
          }
          if (canScroll) {
            return node;
          }
        }
      },

      /**
       * Returns scroll `deltaX` and `deltaY`.
       * @param {!Event} event The scroll event
       * @return {{deltaX: number, deltaY: number}} Object containing the
       * x-axis scroll delta (positive: scroll right, negative: scroll left,
       * 0: no scroll), and the y-axis scroll delta (positive: scroll down,
       * negative: scroll up, 0: no scroll).
       * @private
       */
      _getScrollInfo: function(event) {
        var info = {
          deltaX: event.deltaX,
          deltaY: event.deltaY
        };
        // Already available.
        if ('deltaX' in event) {
          // do nothing, values are already good.
        }
        // Safari has scroll info in `wheelDeltaX/Y`.
        else if ('wheelDeltaX' in event) {
          info.deltaX = -event.wheelDeltaX;
          info.deltaY = -event.wheelDeltaY;
        }
        // Firefox has scroll info in `detail` and `axis`.
        else if ('axis' in event) {
          info.deltaX = event.axis === 1 ? event.detail : 0;
          info.deltaY = event.axis === 2 ? event.detail : 0;
        }
        // On mobile devices, calculate scroll direction.
        else if (event.targetTouches) {
          var touch = event.targetTouches[0];
          // Touch moves from right to left => scrolling goes right.
          info.deltaX = lastTouchPosition.pageX - touch.pageX;
          // Touch moves from down to up => scrolling goes down.
          info.deltaY = lastTouchPosition.pageY - touch.pageY;
        }
        return info;
      }
    };
  })();
(function() {
      'use strict';

      Polymer({
        is: 'iron-dropdown',

        behaviors: [
          Polymer.IronControlState,
          Polymer.IronA11yKeysBehavior,
          Polymer.IronOverlayBehavior,
          Polymer.NeonAnimationRunnerBehavior
        ],

        properties: {
          /**
           * The orientation against which to align the dropdown content
           * horizontally relative to the dropdown trigger.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          horizontalAlign: {
            type: String,
            value: 'left',
            reflectToAttribute: true
          },

          /**
           * The orientation against which to align the dropdown content
           * vertically relative to the dropdown trigger.
           * Overridden from `Polymer.IronFitBehavior`.
           */
          verticalAlign: {
            type: String,
            value: 'top',
            reflectToAttribute: true
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * opening of the dropdown. Pass an Array for multiple animations.
           * See `neon-animation` documentation for more animation configuration
           * details.
           */
          openAnimationConfig: {
            type: Object
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * closing of the dropdown. Pass an Array for multiple animations.
           * See `neon-animation` documentation for more animation configuration
           * details.
           */
          closeAnimationConfig: {
            type: Object
          },

          /**
           * If provided, this will be the element that will be focused when
           * the dropdown opens.
           */
          focusTarget: {
            type: Object
          },

          /**
           * Set to true to disable animations when opening and closing the
           * dropdown.
           */
          noAnimations: {
            type: Boolean,
            value: false
          },

          /**
           * By default, the dropdown will constrain scrolling on the page
           * to itself when opened.
           * Set to true in order to prevent scroll from being constrained
           * to the dropdown when it opens.
           */
          allowOutsideScroll: {
            type: Boolean,
            value: false
          },

          /**
           * Callback for scroll events.
           * @type {Function}
           * @private
           */
          _boundOnCaptureScroll: {
            type: Function,
            value: function() {
              return this._onCaptureScroll.bind(this);
            }
          }
        },

        listeners: {
          'neon-animation-finish': '_onNeonAnimationFinish'
        },

        observers: [
          '_updateOverlayPosition(positionTarget, verticalAlign, horizontalAlign, verticalOffset, horizontalOffset)'
        ],

        /**
         * The element that is contained by the dropdown, if any.
         */
        get containedElement() {
          return Polymer.dom(this.$.content).getDistributedNodes()[0];
        },

        /**
         * The element that should be focused when the dropdown opens.
         * @deprecated
         */
        get _focusTarget() {
          return this.focusTarget || this.containedElement;
        },

        ready: function() {
          // Memoized scrolling position, used to block scrolling outside.
          this._scrollTop = 0;
          this._scrollLeft = 0;
          // Used to perform a non-blocking refit on scroll.
          this._refitOnScrollRAF = null;
        },

        attached: function () {
          if (!this.sizingTarget || this.sizingTarget === this) {
            this.sizingTarget = this.containedElement || this;
          }
        },

        detached: function() {
          this.cancelAnimation();
          document.removeEventListener('scroll', this._boundOnCaptureScroll);
          Polymer.IronDropdownScrollManager.removeScrollLock(this);
        },

        /**
         * Called when the value of `opened` changes.
         * Overridden from `IronOverlayBehavior`
         */
        _openedChanged: function() {
          if (this.opened && this.disabled) {
            this.cancel();
          } else {
            this.cancelAnimation();
            this._updateAnimationConfig();
            this._saveScrollPosition();
            if (this.opened) {
              document.addEventListener('scroll', this._boundOnCaptureScroll);
              !this.allowOutsideScroll && Polymer.IronDropdownScrollManager.pushScrollLock(this);
            } else {
              document.removeEventListener('scroll', this._boundOnCaptureScroll);
              Polymer.IronDropdownScrollManager.removeScrollLock(this);
            }
            Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderOpened: function() {
          if (!this.noAnimations && this.animationConfig.open) {
            this.$.contentWrapper.classList.add('animating');
            this.playAnimation('open');
          } else {
            Polymer.IronOverlayBehaviorImpl._renderOpened.apply(this, arguments);
          }
        },

        /**
         * Overridden from `IronOverlayBehavior`.
         */
        _renderClosed: function() {

          if (!this.noAnimations && this.animationConfig.close) {
            this.$.contentWrapper.classList.add('animating');
            this.playAnimation('close');
          } else {
            Polymer.IronOverlayBehaviorImpl._renderClosed.apply(this, arguments);
          }
        },

        /**
         * Called when animation finishes on the dropdown (when opening or
         * closing). Responsible for "completing" the process of opening or
         * closing the dropdown by positioning it or setting its display to
         * none.
         */
        _onNeonAnimationFinish: function() {
          this.$.contentWrapper.classList.remove('animating');
          if (this.opened) {
            this._finishRenderOpened();
          } else {
            this._finishRenderClosed();
          }
        },

        _onCaptureScroll: function() {
          if (!this.allowOutsideScroll) {
            this._restoreScrollPosition();
          } else {
            this._refitOnScrollRAF && window.cancelAnimationFrame(this._refitOnScrollRAF);
            this._refitOnScrollRAF = window.requestAnimationFrame(this.refit.bind(this));
          }
        },

        /**
         * Memoizes the scroll position of the outside scrolling element.
         * @private
         */
        _saveScrollPosition: function() {
          if (document.scrollingElement) {
            this._scrollTop = document.scrollingElement.scrollTop;
            this._scrollLeft = document.scrollingElement.scrollLeft;
          } else {
            // Since we don't know if is the body or html, get max.
            this._scrollTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
            this._scrollLeft = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
          }
        },

        /**
         * Resets the scroll position of the outside scrolling element.
         * @private
         */
        _restoreScrollPosition: function() {
          if (document.scrollingElement) {
            document.scrollingElement.scrollTop = this._scrollTop;
            document.scrollingElement.scrollLeft = this._scrollLeft;
          } else {
            // Since we don't know if is the body or html, set both.
            document.documentElement.scrollTop = this._scrollTop;
            document.documentElement.scrollLeft = this._scrollLeft;
            document.body.scrollTop = this._scrollTop;
            document.body.scrollLeft = this._scrollLeft;
          }
        },

        /**
         * Constructs the final animation config from different properties used
         * to configure specific parts of the opening and closing animations.
         */
        _updateAnimationConfig: function() {
          // Update the animation node to be the containedElement.
          var animationNode = this.containedElement;
          var animations = [].concat(this.openAnimationConfig || []).concat(this.closeAnimationConfig || []);
          for (var i = 0; i < animations.length; i++) {
            animations[i].node = animationNode;
          }
          this.animationConfig = {
            open: this.openAnimationConfig,
            close: this.closeAnimationConfig
          };
        },

        /**
         * Updates the overlay position based on configured horizontal
         * and vertical alignment.
         */
        _updateOverlayPosition: function() {
          if (this.isAttached) {
            // This triggers iron-resize, and iron-overlay-behavior will call refit if needed.
            this.notifyResize();
          }
        },

        /**
         * Apply focus to focusTarget or containedElement
         */
        _applyFocus: function () {
          var focusTarget = this.focusTarget || this.containedElement;
          if (focusTarget && this.opened && !this.noAutoFocus) {
            focusTarget.focus();
          } else {
            Polymer.IronOverlayBehaviorImpl._applyFocus.apply(this, arguments);
          }
        }
      });
    })();
Polymer({

    is: 'fade-in-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '0'},
        {'opacity': '1'}
      ], this.timingFromConfig(config));
      return this._effect;
    }

  });
Polymer({

    is: 'fade-out-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      this._effect = new KeyframeEffect(node, [
        {'opacity': '1'},
        {'opacity': '0'}
      ], this.timingFromConfig(config));
      return this._effect;
    }

  });
Polymer({
    is: 'paper-menu-grow-height-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var height = rect.height;

      this._effect = new KeyframeEffect(node, [{
        height: (height / 2) + 'px'
      }, {
        height: height + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-grow-width-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var width = rect.width;

      this._effect = new KeyframeEffect(node, [{
        width: (width / 2) + 'px'
      }, {
        width: width + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-shrink-width-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var width = rect.width;

      this._effect = new KeyframeEffect(node, [{
        width: width + 'px'
      }, {
        width: width - (width / 20) + 'px'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });

  Polymer({
    is: 'paper-menu-shrink-height-animation',

    behaviors: [
      Polymer.NeonAnimationBehavior
    ],

    configure: function(config) {
      var node = config.node;
      var rect = node.getBoundingClientRect();
      var height = rect.height;
      var top = rect.top;

      this.setPrefixedProperty(node, 'transformOrigin', '0 0');

      this._effect = new KeyframeEffect(node, [{
        height: height + 'px',
        transform: 'translateY(0)'
      }, {
        height: height / 2 + 'px',
        transform: 'translateY(-20px)'
      }], this.timingFromConfig(config));

      return this._effect;
    }
  });
(function() {
      'use strict';

      var config = {
        ANIMATION_CUBIC_BEZIER: 'cubic-bezier(.3,.95,.5,1)',
        MAX_ANIMATION_TIME_MS: 400
      };

      var PaperMenuButton = Polymer({
        is: 'paper-menu-button',

        /**
         * Fired when the dropdown opens.
         *
         * @event paper-dropdown-open
         */

        /**
         * Fired when the dropdown closes.
         *
         * @event paper-dropdown-close
         */

        behaviors: [
          Polymer.IronA11yKeysBehavior,
          Polymer.IronControlState
        ],

        properties: {
          /**
           * True if the content is currently displayed.
           */
          opened: {
            type: Boolean,
            value: false,
            notify: true,
            observer: '_openedChanged'
          },

          /**
           * The orientation against which to align the menu dropdown
           * horizontally relative to the dropdown trigger.
           */
          horizontalAlign: {
            type: String,
            value: 'left',
            reflectToAttribute: true
          },

          /**
           * The orientation against which to align the menu dropdown
           * vertically relative to the dropdown trigger.
           */
          verticalAlign: {
            type: String,
            value: 'top',
            reflectToAttribute: true
          },

          /**
           * If true, the `horizontalAlign` and `verticalAlign` properties will
           * be considered preferences instead of strict requirements when
           * positioning the dropdown and may be changed if doing so reduces
           * the area of the dropdown falling outside of `fitInto`.
           */
          dynamicAlign: {
            type: Boolean
          },

          /**
           * A pixel value that will be added to the position calculated for the
           * given `horizontalAlign`. Use a negative value to offset to the
           * left, or a positive value to offset to the right.
           */
          horizontalOffset: {
            type: Number,
            value: 0,
            notify: true
          },

          /**
           * A pixel value that will be added to the position calculated for the
           * given `verticalAlign`. Use a negative value to offset towards the
           * top, or a positive value to offset towards the bottom.
           */
          verticalOffset: {
            type: Number,
            value: 0,
            notify: true
          },

          /**
           * If true, the dropdown will be positioned so that it doesn't overlap
           * the button.
           */
          noOverlap: {
            type: Boolean
          },

          /**
           * Set to true to disable animations when opening and closing the
           * dropdown.
           */
          noAnimations: {
            type: Boolean,
            value: false
          },

          /**
           * Set to true to disable automatically closing the dropdown after
           * a selection has been made.
           */
          ignoreSelect: {
            type: Boolean,
            value: false
          },

          /**
           * Set to true to enable automatically closing the dropdown after an
           * item has been activated, even if the selection did not change.
           */
          closeOnActivate: {
            type: Boolean,
            value: false
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * opening of the dropdown.
           */
          openAnimationConfig: {
            type: Object,
            value: function() {
              return [{
                name: 'fade-in-animation',
                timing: {
                  delay: 100,
                  duration: 200
                }
              }, {
                name: 'paper-menu-grow-width-animation',
                timing: {
                  delay: 100,
                  duration: 150,
                  easing: config.ANIMATION_CUBIC_BEZIER
                }
              }, {
                name: 'paper-menu-grow-height-animation',
                timing: {
                  delay: 100,
                  duration: 275,
                  easing: config.ANIMATION_CUBIC_BEZIER
                }
              }];
            }
          },

          /**
           * An animation config. If provided, this will be used to animate the
           * closing of the dropdown.
           */
          closeAnimationConfig: {
            type: Object,
            value: function() {
              return [{
                name: 'fade-out-animation',
                timing: {
                  duration: 150
                }
              }, {
                name: 'paper-menu-shrink-width-animation',
                timing: {
                  delay: 100,
                  duration: 50,
                  easing: config.ANIMATION_CUBIC_BEZIER
                }
              }, {
                name: 'paper-menu-shrink-height-animation',
                timing: {
                  duration: 200,
                  easing: 'ease-in'
                }
              }];
            }
          },

          /**
           * By default, the dropdown will constrain scrolling on the page
           * to itself when opened.
           * Set to true in order to prevent scroll from being constrained
           * to the dropdown when it opens.
           */
          allowOutsideScroll: {
            type: Boolean,
            value: false
          },

          /**
           * Whether focus should be restored to the button when the menu closes.
           */
          restoreFocusOnClose: {
            type: Boolean,
            value: true
          },

          /**
           * This is the element intended to be bound as the focus target
           * for the `iron-dropdown` contained by `paper-menu-button`.
           */
          _dropdownContent: {
            type: Object
          }
        },

        hostAttributes: {
          role: 'group',
          'aria-haspopup': 'true'
        },

        listeners: {
          'iron-activate': '_onIronActivate',
          'iron-select': '_onIronSelect'
        },

        /**
         * The content element that is contained by the menu button, if any.
         */
        get contentElement() {
          return Polymer.dom(this.$.content).getDistributedNodes()[0];
        },

        /**
         * Toggles the drowpdown content between opened and closed.
         */
        toggle: function() {
          if (this.opened) {
            this.close();
          } else {
            this.open();
          }
        },

        /**
         * Make the dropdown content appear as an overlay positioned relative
         * to the dropdown trigger.
         */
        open: function() {
          if (this.disabled) {
            return;
          }

          this.$.dropdown.open();
        },

        /**
         * Hide the dropdown content.
         */
        close: function() {
          this.$.dropdown.close();
        },

        /**
         * When an `iron-select` event is received, the dropdown should
         * automatically close on the assumption that a value has been chosen.
         *
         * @param {CustomEvent} event A CustomEvent instance with type
         * set to `"iron-select"`.
         */
        _onIronSelect: function(event) {
          if (!this.ignoreSelect) {
            this.close();
          }
        },

        /**
         * Closes the dropdown when an `iron-activate` event is received if
         * `closeOnActivate` is true.
         *
         * @param {CustomEvent} event A CustomEvent of type 'iron-activate'.
         */
        _onIronActivate: function(event) {
          if (this.closeOnActivate) {
            this.close();
          }
        },

        /**
         * When the dropdown opens, the `paper-menu-button` fires `paper-open`.
         * When the dropdown closes, the `paper-menu-button` fires `paper-close`.
         *
         * @param {boolean} opened True if the dropdown is opened, otherwise false.
         * @param {boolean} oldOpened The previous value of `opened`.
         */
        _openedChanged: function(opened, oldOpened) {
          if (opened) {
            // TODO(cdata): Update this when we can measure changes in distributed
            // children in an idiomatic way.
            // We poke this property in case the element has changed. This will
            // cause the focus target for the `iron-dropdown` to be updated as
            // necessary:
            this._dropdownContent = this.contentElement;
            this.fire('paper-dropdown-open');
          } else if (oldOpened != null) {
            this.fire('paper-dropdown-close');
          }
        },

        /**
         * If the dropdown is open when disabled becomes true, close the
         * dropdown.
         *
         * @param {boolean} disabled True if disabled, otherwise false.
         */
        _disabledChanged: function(disabled) {
          Polymer.IronControlState._disabledChanged.apply(this, arguments);
          if (disabled && this.opened) {
            this.close();
          }
        },

        __onIronOverlayCanceled: function(event) {
          var uiEvent = event.detail;
          var target = Polymer.dom(uiEvent).rootTarget;
          var trigger = this.$.trigger;
          var path = Polymer.dom(uiEvent).path;

          if (path.indexOf(trigger) > -1) {
            event.preventDefault();
          }
        }
      });

      Object.keys(config).forEach(function (key) {
        PaperMenuButton[key] = config[key];
      });

      Polymer.PaperMenuButton = PaperMenuButton;
    })();
console.warn('This file is deprecated. Please use `iron-flex-layout/iron-flex-layout-classes.html`, and one of the specific dom-modules instead');
console.warn('This file is deprecated. Please use `iron-flex-layout/iron-flex-layout-classes.html`, and one of the specific dom-modules instead');
/** @polymerBehavior Polymer.PaperItemBehavior */
  Polymer.PaperItemBehaviorImpl = {
    hostAttributes: {
      role: 'option',
      tabindex: '0'
    }
  };

  /** @polymerBehavior */
  Polymer.PaperItemBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperItemBehaviorImpl
  ];
Polymer({
      is: 'paper-item',

      behaviors: [
        Polymer.PaperItemBehavior
      ]
    });
Polymer({

    is: 'iron-collapse',

    behaviors: [
      Polymer.IronResizableBehavior
    ],

    properties: {

      /**
       * If true, the orientation is horizontal; otherwise is vertical.
       *
       * @attribute horizontal
       */
      horizontal: {
        type: Boolean,
        value: false,
        observer: '_horizontalChanged'
      },

      /**
       * Set opened to true to show the collapse element and to false to hide it.
       *
       * @attribute opened
       */
      opened: {
        type: Boolean,
        value: false,
        notify: true,
        observer: '_openedChanged'
      },

      /**
       * When true, the element is transitioning its opened state. When false,
       * the element has finished opening/closing.
       *
       * @attribute transitioning
       */
      transitioning: {
        type: Boolean,
        notify: true,
        readOnly: true
      },

      /**
       * Set noAnimation to true to disable animations.
       *
       * @attribute noAnimation
       */
      noAnimation: {
        type: Boolean
      },

      /**
       * Stores the desired size of the collapse body.
       * @private
       */
      _desiredSize: {
        type: String,
        value: ''
      }
    },

    get dimension() {
      return this.horizontal ? 'width' : 'height';
    },

    /**
     * `maxWidth` or `maxHeight`.
     * @private
     */
    get _dimensionMax() {
      return this.horizontal ? 'maxWidth' : 'maxHeight';
    },

    /**
     * `max-width` or `max-height`.
     * @private
     */
    get _dimensionMaxCss() {
      return this.horizontal ? 'max-width' : 'max-height';
    },

    hostAttributes: {
      role: 'group',
      'aria-hidden': 'true',
      'aria-expanded': 'false'
    },

    listeners: {
      transitionend: '_onTransitionEnd'
    },

    /**
     * Toggle the opened state.
     *
     * @method toggle
     */
    toggle: function() {
      this.opened = !this.opened;
    },

    show: function() {
      this.opened = true;
    },

    hide: function() {
      this.opened = false;
    },

    /**
     * Updates the size of the element.
     * @param {string} size The new value for `maxWidth`/`maxHeight` as css property value, usually `auto` or `0px`.
     * @param {boolean=} animated if `true` updates the size with an animation, otherwise without.
     */
    updateSize: function(size, animated) {
      // Consider 'auto' as '', to take full size.
      size = size === 'auto' ? '' : size;

      var willAnimate = animated && !this.noAnimation &&
                        this.isAttached && this._desiredSize !== size;

      this._desiredSize = size;

      this._updateTransition(false);
      // If we can animate, must do some prep work.
      if (willAnimate) {
        // Animation will start at the current size.
        var startSize = this._calcSize();
        // For `auto` we must calculate what is the final size for the animation.
        // After the transition is done, _transitionEnd will set the size back to `auto`.
        if (size === '') {
          this.style[this._dimensionMax] = '';
          size = this._calcSize();
        }
        // Go to startSize without animation.
        this.style[this._dimensionMax] = startSize;
        // Force layout to ensure transition will go. Set scrollTop to itself
        // so that compilers won't remove it.
        this.scrollTop = this.scrollTop;
        // Enable animation.
        this._updateTransition(true);
        // If final size is the same as startSize it will not animate.
        willAnimate = (size !== startSize);
      }
      // Set the final size.
      this.style[this._dimensionMax] = size;
      // If it won't animate, call transitionEnd to set correct classes.
      if (!willAnimate) {
        this._transitionEnd();
      }
    },

    /**
     * enableTransition() is deprecated, but left over so it doesn't break existing code.
     * Please use `noAnimation` property instead.
     *
     * @method enableTransition
     * @deprecated since version 1.0.4
     */
    enableTransition: function(enabled) {
      Polymer.Base._warn('`enableTransition()` is deprecated, use `noAnimation` instead.');
      this.noAnimation = !enabled;
    },

    _updateTransition: function(enabled) {
      this.style.transitionDuration = (enabled && !this.noAnimation) ? '' : '0s';
    },

    _horizontalChanged: function() {
      this.style.transitionProperty = this._dimensionMaxCss;
      var otherDimension = this._dimensionMax === 'maxWidth' ? 'maxHeight' : 'maxWidth';
      this.style[otherDimension] = '';
      this.updateSize(this.opened ? 'auto' : '0px', false);
    },

    _openedChanged: function() {
      this.setAttribute('aria-expanded', this.opened);
      this.setAttribute('aria-hidden', !this.opened);

      this._setTransitioning(true);
      this.toggleClass('iron-collapse-closed', false);
      this.toggleClass('iron-collapse-opened', false);
      this.updateSize(this.opened ? 'auto' : '0px', true);

      // Focus the current collapse.
      if (this.opened) {
        this.focus();
      }
    },

    _transitionEnd: function() {
      this.style[this._dimensionMax] = this._desiredSize;
      this.toggleClass('iron-collapse-closed', !this.opened);
      this.toggleClass('iron-collapse-opened', this.opened);
      this._updateTransition(false);
      this.notifyResize();
      this._setTransitioning(false);
    },

    _onTransitionEnd: function(event) {
      if (Polymer.dom(event).rootTarget === this) {
        this._transitionEnd();
      }
    },

    _calcSize: function() {
      return this.getBoundingClientRect()[this.dimension] + 'px';
    }

  });
/**
 * Common properties and methods for docs tree view.
 *
 * @polymerBehavior Polymer.RamlTreeItemBehavior
 */
Polymer.RamlTreeItemBehavior = {
  properties: {
    // A path the item represents.
    path: {
      type: String,
      value: ''
    },
    // Currently selected path.
    selectedPath: String,
    // True if the item is selected
    isSelected: {
      type: Boolean,
      computed: '_computeIsSelected(selectedPath, path)'
    },
    /**
     * Prohibits the selection of the resource and only allow selection of methods.
     */
    noResourceSelection: {
      type: Boolean
    }
  },
  /**
   * Event handler for the click on an tree item.
   * It sends the `raml-path-selected` event so the tree selected can set
   * path.
   *
   * @param {Event} e Event fired by the HTML element. The element must have
   * data-path attribute with its correct path.
   */
  _selectPath: function(e) {
    var target = e.target;
    while (true) {
      if (!target || target === document.body) {
        return;
      }
      if (target.nodeName && target.nodeName === 'PAPER-ITEM') {
        break;
      }
      if (!target.parentNode) {
        return;
      }
      target = target.parentNode;
    }
    var path = target.dataset ? target.dataset.path : null;
    if (!path) {
      return;
    }
    if (this.noResourceSelection) {
      if (/resources.\d+$/.test(path)) {
        this.opened = !this.opened;
        return;
      }
    }

    this.fire('raml-path-selected', {
      path: path
    });
  },
  /**
   * Computes if the tree item should have the `selected` class
   * indicating that the item is currently selected.
   *
   * @param {String} selectedPath Currently selected path
   * @param {String} path Item's (element's) path
   * @param {Number} index Optional index of the item in the view.
   * If set it means that the item is a method of a resource.
   * @return {String} Either empty string or `selected` if the path match.
   */
  _computeItemSelectableClass: function(selectedPath, path, index) {
    if (index !== undefined) {
      path = path + '.methods.' + index;
    }
    if (path === selectedPath) {
      return 'selected';
    }
    return '';
  },

  // Computes if selected path equals current item path.
  _computeIsSelected: function(selectedPath, path) {
    if (!selectedPath || !path) {
      return false;
    }
    return selectedPath === path;
  },
  /**
   * Scrolls to the element if the element is not in view.
   */
  scrollElementIntoView: function() {
    if (this.scrollIntoViewIfNeeded) {
      this.scrollIntoViewIfNeeded();
    } else if (this.scrollIntoView) {
      this.scrollIntoView();
    }
  }
};
Polymer({
    is: 'raml-resource-tree-item',
    behaviors: [Polymer.RamlTreeItemBehavior, Polymer.IronA11yKeysBehavior],
    properties: {
      // A resource object from the RAML definition
      resource: Object,
      // If set the item will have methods and 1st level subresources visible
      opened: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      // Title attribute of the resource item
      resourceTitle: {
        type: String,
        computed: '_computeResourceTitle(resource.*)'
      },
      // Computed value, true if method of this resource is selected.
      methodIsSelected: {
        type: Boolean,
        value: false,
        computed: '_computeIsSelectedMethod(isSelected, selectedPath, path, _isReady)'
      },
      // True when the element has been initialized
      _isReady: {
        type: Boolean,
        value: false
      }
    },

    observers: [
      '_isSelectedChanged(isSelected, methodIsSelected, _isReady)',
      '_openedChanged(opened)'
    ],

    listeners: {
      'opened-changed': '_openedHandler'
    },

    keyBindings: {
      'left': '_onLeftKey',
      'right': '_onRightKey'
    },

    ready: function() {
      this._isReady = true;
    },

    // Returns a `displayName` or `relativeUri` for the resource.
    _getName: function(resource) {
      return resource.displayName || resource.relativeUri;
    },
    // Returns a `displayName` or method uppercased for the method.
    _getMethodName: function(item) {
      return item.displayName || item.method.toUpperCase();
    },
    // Toggles `opened` attribute
    toggle: function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.opened = !this.opened;
    },
    // Compute resource's title attribute
    _computeResourceTitle: function() {
      var r = this.resource;
      if (!r || !r.relativeUri) {
        return '';
      }
      var result = r.relativeUri;
      if (r.description) {
        result += ': ' + r.description;
      }
      return result;
    },
    /**
     * Sets the `tabindex` property if the selection changes.
     */
    _isSelectedChanged: function(isSelected, methodIsSelected, ready) {
      if ((isSelected || methodIsSelected) && ready) {
        this.setAttribute('tabindex', '0');
        this.scrollElementIntoView();
        if (!this.opened) {
          this.set('opened', true);
        }
        this.focus();
      } else {
        this.setAttribute('tabindex', '-1');
      }
    },
    // Computes if any method of this resource is currently selected.
    _computeIsSelectedMethod: function(isSelected, selectedPath, path, ready) {
      if (isSelected === true || !selectedPath || !path || !ready) {
        return false;
      }
      if (selectedPath.indexOf(path + '.methods.') === 0) {
        return true;
      }
      return false;
    },
    /**
     * Fires an event to parent elements that this element has been opened and they should be
     * opened as well.
     */
    _openedChanged: function(opened) {
      if (opened) {
        this.fire('opened-changed', {
          value: true
        });
      }
    },
    /**
     * Handler for the `opened-changed` event from the child elements.
     * It opens this element if child was opened.
     */
    _openedHandler: function(event) {
      if (event.target === this) {
        return;
      }
      if (event.detail.value) {
        this.opened = true;
      }
    },
    /**
     * Handler that is called when the left key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onLeftKey: function(event) {
      if (!this.isSelected) {
        return;
      }
      this.opened = false;
      event.detail.keyboardEvent.preventDefault();
    },
    /**
     * Handler that is called when the right key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onRightKey: function(event) {
      if (!this.isSelected) {
        return;
      }
      this.opened = true;
      event.detail.keyboardEvent.preventDefault();
    }
  });
Polymer({
    is: 'raml-documentation-tree-item',

    behaviors: [Polymer.RamlTreeItemBehavior],

    properties: {
      // A documentation item from the RAML's documentation node.
      doc: Object,
      // True if the resource is currently selected.
      docIsSelected: {
        type: Boolean,
        computed: '_computeIsSelected(selectedPath, path)'
      },
    },

    observers: [
      '_isSelectedChanged(isSelected)'
    ],

    /**
     * Sets the `tabindex` property if the selection changes.
     */
    _isSelectedChanged: function(isSelected) {
      if (isSelected) {
        this.setAttribute('tabindex', '0');
        this.scrollElementIntoView();
        this.focus();
      } else {
        this.setAttribute('tabindex', '-1');
      }
    },
  });
Polymer({
    is: 'raml-structure-tree',
    behaviors: [Polymer.RamlBehavior, Polymer.IronA11yKeysBehavior],

    /**
     * Fired when the path change.
     *
     * @event raml-selected-path-changed
     * @param {String} path The selected path
     */

    properties: {
      // Currently selected by the user path.
      selectedPath: {
        type: String,
        notify: true
      },
      // If true then the first level of resources will be opened by default.
      opened: {
        type: Boolean,
        value: false
      },
      // Is set to true when the RAML's `resources` array is not empty
      hasDocumentation: Boolean,
      // Is set to true when the RAML's `documentation` array is not empty
      hasResources: Boolean,
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },

      // A widith below which the `narrow` property will be set to true.
      narrowWidth: {
        type: String,
        value: '768px'
      },
      /**
       * If set the element will render the resources / methods tree.
       * It can be used in views when only resources are relevant giving the
       * context.
       */
      resourcesOnly: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      /**
       * If set then the selection of the resource node will be not possible.
       * It will opens / closes child elements.
       */
      noResourceSelection: {
        type: Boolean
      }
    },

    hostAttributes: {
      role: 'listbox',
      tabindex: '0'
    },

    listeners: {
      'raml-path-selected': '_onPathSelected'
    },

    keyBindings: {
      'up': '_onUpKey',
      'down': '_onDownKey'
    },

    observers: ['_patchChanged(selectedPath)'],

    // Sets the `selectedPath` value form the `raml-path-selected` event.
    _onPathSelected: function(e) {
      e.stopPropagation();
      this.set('selectedPath', e.detail.path);
    },

    // Fires the `raml-selected-path-changed` event when the path changes.
    _patchChanged: function(selectedPath) {
      this.fire('raml-selected-path-changed', {
        path: selectedPath
      });
    },

    /**
     * Handler that is called when the up key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onUpKey: function(event) {
      // up and down arrows moves the focus
      this.selectPrevious();
      event.detail.keyboardEvent.preventDefault();
    },

    /**
     * Handler that is called when the down key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onDownKey: function(event) {
      this.selectNext();
      event.detail.keyboardEvent.preventDefault();
    },
    /**
     * Selects next item on the list.
     *
     * It changes a path and the selection is changed by the child elements.
     */
    selectNext: function() {
      // first we need to recognize selection area (docs/resources)
      var path = this.selectedPath;
      if (!path) {
        return this._selectFirstItem();
      }
      var moved;
      var isDocs = path.indexOf('documentation') === 0;
      if (isDocs) {
        moved = this._selectNextDoc();
        if (moved) {
          return;
        } else {
          return this._selectFirstResource();
        }
      }
      var isResources = path.indexOf('resources') === 0;
      if (isResources) {
        moved = this._selectNextResource();
        if (moved) {
          return;
        } else {
          return this._selectFirstItem();
        }
      }
    },
    /**
     * Selects previous item on the list.
     *
     * It changes a path and the selection is changed by the child elements.
     */
    selectPrevious: function() {
      // first we need to recognize selection area (docs/resources)
      var path = this.selectedPath;
      if (!path) {
        return this._selectFirstItem();
      }
      var moved;
      var isDocs = path.indexOf('documentation') === 0;
      if (isDocs) {
        moved = this._selectPreviousDoc();
        if (moved) {
          return;
        } else {
          return this._selectLastMethod();
        }
      }
      var isResources = path.indexOf('resources') === 0;
      if (isResources) {
        moved = this._selectPreviousResource();
        if (moved) {
          return;
        } else {
          return this._selectLastDoc();
        }
      }
    },
    /**
     * Sets the path to the first available item.
     */
    _selectFirstItem: function() {
      if (this.hasDocumentation) {
        this.set('selectedPath', 'documentation.0');
      } else if (this.hasResources) {
        this.set('selectedPath', 'resources.0');
      }
    },

    /**
     * Sets the path to the first available resource item.
     */
    _selectFirstResource: function() {
      if (this.hasResources) {
        this.set('selectedPath', 'resources.0');
      }
    },
    // Selects the last method in the last resource.
    _selectLastMethod: function() {
      if (!this.hasResources) {
        return this._selectFirstItem();
      }
      var res = this.raml.resources;
      var current = res[res.length - 1];
      if (!current) {
        return;
      }
      var path = 'resources.' + (res.length - 1);
      while (true) {
        if (!current.resources) {
          if ('methods' in current) {
            path += '.methods.' + String(current.methods.length - 1);
          }
          break;
        }
        var i = current.resources.length - 1;
        path += '.resources.' + i;
        current = current.resources[i];
      }
      this.set('selectedPath', path);
    },

    /**
     * Selects a next documentation item.
     *
     * @return {Boolean} True if moved and false otherwise.
     * Note that this will return try on error so the caller won't try to select another section.
     */
    _selectNextDoc: function() {
      if (!this.selectedPath) {
        return true;
      }
      var index = Number(this.selectedPath.substr(14));
      if (index !== index) {
        return true;
      }
      var docs = this.raml.documentation;
      index++;
      if (docs.length <= index) {
        return false;
      }

      this.set('selectedPath', 'documentation.' + index);
      return true;
    },
    /**
     * Selectes the last documentation item.
     */
    _selectLastDoc: function() {
      if (this.hasDocumentation) {
        var index = this.raml.documentation.length - 1;
        this.set('selectedPath', 'documentation.' + index);
      }
    },
    /**
     * Selects a previous documentation item.
     *
     * @return {Boolean} True if moved and false otherwise.
     * Note that this will return try on error so the caller won't try to select another section.
     */
    _selectPreviousDoc: function() {
      if (!this.selectedPath) {
        return true;
      }
      var index = Number(this.selectedPath.substr(14));
      if (index !== index) {
        return true;
      }
      if (index === 0) {
        return false;
      }
      index--;
      this.set('selectedPath', 'documentation.' + index);
      return true;
    },
    /**
     * Selects the next method or sub-sresource in the selected resource.
     *
     * @return {Boolean} True if moved and false otherwise.
     * Note that this will return try on error so the caller won't try to select another section.
     */
    _selectNextResource: function() {
      var path = this.selectedPath;
      if (!path) {
        return true;
      }
      var def = this.get('raml.' + path);
      if (!def) {
        return true;
      }
      var matches = path.match(/\d+/g);
      var newPath;
      if (!('methods' in def) && !('resources' in def)) {
        // it is a method.
        var methodIndex = Number(matches.pop());
        if (methodIndex !== methodIndex) {
          return true;
        }
        methodIndex++;
        newPath = this._getMethodPath(matches, methodIndex);
        if (this.get('raml.' + newPath)) {
          this.set('selectedPath', newPath);
          return true;
        }
        return this._selectNextResourceItem(matches);
      } else {
        if (!('methods' in def)) {
          return this._selectNextResourceItem(matches);
        } else {
          // select first method
          newPath = this._getMethodPath(matches, 0);
          if (this.get('raml.' + newPath)) {
            this.set('selectedPath', newPath);
            return true;
          }
          return this._selectNextResourceItem(matches);
        }
      }
    },
    /**
     * Selects the previous method or sub-sresource in the selected resource. Or previous resource
     * if exists and there's no sub-resources available.
     *
     * @return {Boolean} True if moved and false otherwise.
     * Note that this will return try on error so the caller won't try to select another section.
     */
    _selectPreviousResource: function() {
      var path = this.selectedPath;
      if (!path) {
        return true;
      }
      var def = this.get('raml.' + path);
      if (!def) {
        return true;
      }
      var matches = path.match(/\d+/g);
      var newPath;
      if (!('methods' in def) && !('resources' in def)) {
        var methodIndex = Number(matches.pop());
        if (methodIndex !== methodIndex) {
          return true;
        }
        if (methodIndex === 0) {
          methodIndex = Number(matches.pop());
          if (methodIndex !== methodIndex) {
            return true;
          }
          newPath = this._getResourcePath(matches, methodIndex);
          this.set('selectedPath', newPath);
          return true;
        }
        methodIndex--;
        newPath = this._getMethodPath(matches, methodIndex);
        this.set('selectedPath', newPath);
        return true;
      } else {
        return this._selectPreviousResourceItem(matches, matches.pop());
      }
    },
    /**
     * Gets the path for the method.
     *
     * @param {Array<Number|String>} indexes Array of resource indexes
     * @param {Number|String} methodIndex Index of the method
     * @return {String} Path to the method.
     */
    _getMethodPath: function(indexes, methodIndex) {
      var path = '';
      indexes.forEach(function(item) {
        path += 'resources.' + item + '.';
      });
      path += 'methods.' + methodIndex;
      return path;
    },

    /**
     * Gets the path for the resource.
     *
     * @param {Array<Number|String>} indexes Array of resource indexes
     * @param {Number|String} resourceIndex Index of the resource
     * @return {String} Path to the resource.
     */
    _getResourcePath: function(indexes, resourceIndex) {
      var path = '';
      indexes.forEach(function(item) {
        path += 'resources.' + item + '.';
      });
      path += 'resources.' + resourceIndex;
      return path;
    },
    /**
     * This will go up on the resource tree to find any tree item that has next (sub) resource.
     * If found it will set current path to the resource and return true. Otherwise it returns
     * false.
     *
     * @param {Array<String|Number>} matches A list of current resource indexes.
     * @return {Boolean} .
     */
    _selectNextResourceItem: function(matches, nextResourceIndex) {
      nextResourceIndex = nextResourceIndex || 0;
      // select next sub-resource
      var newPath = this._getResourcePath(matches, nextResourceIndex);
      if (this.get('raml.' + newPath)) {
        this.set('selectedPath', newPath);
        return true;
      }

      if (!matches.length) {
        return false;
      }

      // select next resource
      var resourceIndex = Number(matches.pop());
      if (resourceIndex !== resourceIndex) {
        return true;
      }
      resourceIndex++;
      newPath = this._getResourcePath(matches, resourceIndex);
      if (this.get('raml.' + newPath)) {
        this.set('selectedPath', newPath);
        return true;
      }

      if (!matches.length) {
        return false;
      }

      return this._selectNextResourceItem(matches, ++nextResourceIndex);
    },
    /**
     * This will go up on the resource tree to find any tree item that has previous (sub) resource
     * or method.
     * If found it will set current path to the resource and return true. Otherwise it returns
     * false.
     *
     * @param {Array<String|Number>} matches A list of current resource indexes.
     * @return {Boolean} .
     */
    _selectPreviousResourceItem: function(matches, prevSelectedResource) {
      var currentResource;
      if (matches.length === 0) {
        currentResource = Number(prevSelectedResource);
        currentResource--;
        if (currentResource < 0) {
          return false;
        }
      } else {
        currentResource = Number(matches.pop());
      }
      if ((!currentResource && currentResource !== 0) || currentResource !== currentResource) {
        return false;
      }
      var newPath = this._getResourcePath(matches, currentResource);
      var resource = this.get('raml.' + newPath);
      if (resource) {
        if ('resources' in resource) {
          while (true) {
            if (!('resources' in resource)) {
              break;
            }
            var i = resource.resources.length - 1;
            if (String(i) === prevSelectedResource) {
              if (i === 0) {
                break;
              } else {
                i--;
              }
            }
            newPath += '.resources.' + i;
            resource = resource.resources[i];
          }
        }
        if ('methods' in resource) {
          newPath += '.methods.' + String(resource.methods.length - 1);
        }
        this.set('selectedPath', newPath);
        return true;
      }
      // heare means we are in the top of the tree and there's no previous method / resource
      return false;
    }
  });
Polymer({
    is: 'raml-path-selector',
    behaviors: [Polymer.RamlBehavior],

    properties: {
      // Currently selected by the user path.
      selectedPath: {
        type: String,
        notify: true
      },
      // If true then the first level of resources will be opened by default.
      opened: {
        type: Boolean,
        value: false
      },
      // Is set to true when the RAML's `resources` array is not empty
      hasDocumentation: {
        type: Boolean,
        value: false,
        computed: '_computeHasInArray(raml.documentation.length)'
      },
      // Is set to true when the RAML's `documentation` array is not empty
      hasResources: {
        type: Boolean,
        value: false,
        computed: '_computeHasInArray(raml.resources.length)'
      },
      // Name of the `<raml-aware>` scope, so it will fill the raml property.
      aware: String,
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true
      },
      // A widith below which the `narrow` property will be set to true.
      narrowWidth: {
        type: String,
        value: '768px'
      },
      /**
       * If set the element will render the resources / methods tree.
       * It can be used in views when only resources are relevant giving the
       * context.
       */
      resourcesOnly: {
        type: Boolean,
        value: false
      },
      // In narrow view it is showing the path of the raml.
      selectedLabel: {
        type: String,
        computed: '_computeSelectedLabel(narrow, raml, selectedPath)'
      },
      /**
       * If set then the selection of the resource node will be not possible.
       * It will opens / closes child elements.
       */
      noResourceSelection: {
        type: Boolean
      },
      /**
       * If set it will override the narrow layout property and force
       * wide layout. Then it will also ignore the media queries settings.
       */
      forceWideLayout: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      _narrowValue: {
        type: Boolean,
        value: false,
        computed: '_computeNarrowValue(forceWideLayout, narrow)'
      }
    },

    // Computes if given array has values.
    _computeHasInArray: function(length) {
      return !!length;
    },

    _computeSelectedLabel: function(narrow, raml, selectedPath) {
      if (!narrow || !selectedPath || !raml) {
        return '';
      }
      var object = this.get('raml.' + selectedPath);
      if (!object) {
        return '';
      }
      if (selectedPath.indexOf('documentation') === 0) {
        return object.title || 'Documentation';
      }
      var str = ''; //object.displayName || object.method || object.name;
      var matches = selectedPath.match(/\d+/g);
      var current = this.raml;
      matches.pop();
      matches.forEach(function(item) {
        item = Number(item);
        current = current.resources[item];
        str += (current.displayName || current.name) + ' > ';
      });
      str += object.displayName || object.name || object.method;
      return str;
    },
    /**
     * Computes the `narrowValue` property.
     * If `forceWideLayout` is set then it will always return `false`.
     * Otherwise it depends on the `narrow` value.
     */
    _computeNarrowValue: function(forceWideLayout, narrow) {
      if (forceWideLayout) {
        return false;
      }
      return narrow;
    }
  });
/** @polymerBehavior Polymer.PaperButtonBehavior */
  Polymer.PaperButtonBehaviorImpl = {
    properties: {
      /**
       * The z-depth of this element, from 0-5. Setting to 0 will remove the
       * shadow, and each increasing number greater than 0 will be "deeper"
       * than the last.
       *
       * @attribute elevation
       * @type number
       * @default 1
       */
      elevation: {
        type: Number,
        reflectToAttribute: true,
        readOnly: true
      }
    },

    observers: [
      '_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
      '_computeKeyboardClass(receivedFocusFromKeyboard)'
    ],

    hostAttributes: {
      role: 'button',
      tabindex: '0',
      animated: true
    },

    _calculateElevation: function() {
      var e = 1;
      if (this.disabled) {
        e = 0;
      } else if (this.active || this.pressed) {
        e = 4;
      } else if (this.receivedFocusFromKeyboard) {
        e = 3;
      }
      this._setElevation(e);
    },

    _computeKeyboardClass: function(receivedFocusFromKeyboard) {
      this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes down,
     * create a ripple down effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyDownHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
      // Ensure that there is at most one ripple when the space key is held down.
      if (this.hasRipple() && this.getRipple().ripples.length < 1) {
        this._ripple.uiDownAction();
      }
    },

    /**
     * In addition to `IronButtonState` behavior, when space key goes up,
     * create a ripple up effect.
     *
     * @param {!KeyboardEvent} event .
     */
    _spaceKeyUpHandler: function(event) {
      Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
      if (this.hasRipple()) {
        this._ripple.uiUpAction();
      }
    }
  };

  /** @polymerBehavior */
  Polymer.PaperButtonBehavior = [
    Polymer.IronButtonState,
    Polymer.IronControlState,
    Polymer.PaperRippleBehavior,
    Polymer.PaperButtonBehaviorImpl
  ];
Polymer({
      is: 'paper-button',

      behaviors: [
        Polymer.PaperButtonBehavior
      ],

      properties: {
        /**
         * If true, the button should be styled with a shadow.
         */
        raised: {
          type: Boolean,
          reflectToAttribute: true,
          value: false,
          observer: '_calculateElevation'
        }
      },

      _calculateElevation: function() {
        if (!this.raised) {
          this._setElevation(0);
        } else {
          Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
        }
      }

      /**
      Fired when the animation finishes.
      This is useful if you want to wait until
      the ripple animation finishes to perform some action.

      @event transitionend
      Event param: {{node: Object}} detail Contains the animated node.
      */
    });
/* **********************************************
     Begin prism-core.js
********************************************** */

var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function(){

// Private helper vars
var lang = /\blang(?:uage)?-(\w+)\b/i;
var uniqueId = 0;

var _ = _self.Prism = {
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (_.util.type(tokens) === 'Array') {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
		},

		objId: function (obj) {
			if (!obj['__id']) {
				Object.defineProperty(obj, '__id', { value: ++uniqueId });
			}
			return obj['__id'];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function (o) {
			var type = _.util.type(o);

			switch (type) {
				case 'Object':
					var clone = {};

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = _.util.clone(o[key]);
						}
					}

					return clone;

				case 'Array':
					// Check for existence for IE8
					return o.map && o.map(function(v) { return _.util.clone(v); });
			}

			return o;
		}
	},

	languages: {
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Insert a token before another token in a language literal
		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
		 * we cannot just provide an object, we need anobject and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before. If not provided, the function appends instead.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];

			if (arguments.length == 2) {
				insert = arguments[1];

				for (var newToken in insert) {
					if (insert.hasOwnProperty(newToken)) {
						grammar[newToken] = insert[newToken];
					}
				}

				return grammar;
			}

			var ret = {};

			for (var token in grammar) {

				if (grammar.hasOwnProperty(token)) {

					if (token == before) {

						for (var newToken in insert) {

							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					ret[token] = grammar[token];
				}
			}

			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === root[inside] && key != inside) {
					this[key] = ret;
				}
			});

			return root[inside] = ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function(o, callback, type, visited) {
			visited = visited || {};
			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
						visited[_.util.objId(o[i])] = true;
						_.languages.DFS(o[i], callback, null, visited);
					}
					else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
						visited[_.util.objId(o[i])] = true;
						_.languages.DFS(o[i], callback, i, visited);
					}
				}
			}
		}
	},
	plugins: {},

	highlightAll: function(async, callback) {
		var env = {
			callback: callback,
			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
		};

		_.hooks.run("before-highlightall", env);

		var elements = env.elements || document.querySelectorAll(env.selector);

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, env.callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language, grammar, parent = element;

		while (parent && !lang.test(parent.className)) {
			parent = parent.parentNode;
		}

		if (parent) {
			language = (parent.className.match(lang) || [,''])[1].toLowerCase();
			grammar = _.languages[language];
		}

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		parent = element.parentNode;

		if (/pre/i.test(parent.nodeName)) {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		_.hooks.run('before-sanity-check', env);

		if (!env.code || !env.grammar) {
			if (env.code) {
				env.element.textContent = env.code;
			}
			_.hooks.run('complete', env);
			return;
		}

		_.hooks.run('before-highlight', env);

		if (async && _self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				env.highlightedCode = evt.data;

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				callback && callback.call(env.element);
				_.hooks.run('after-highlight', env);
				_.hooks.run('complete', env);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code,
				immediateClose: true
			}));
		}
		else {
			env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			callback && callback.call(element);

			_.hooks.run('after-highlight', env);
			_.hooks.run('complete', env);
		}
	},

	highlight: function (text, grammar, language) {
		var tokens = _.tokenize(text, grammar);
		return Token.stringify(_.util.encode(tokens), language);
	},

	tokenize: function(text, grammar, language) {
		var Token = _.Token;

		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		tokenloop: for (var token in grammar) {
			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					greedy = !!pattern.greedy,
					lookbehindLength = 0,
					alias = pattern.alias;

				if (greedy && !pattern.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
					pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
				}

				pattern = pattern.pattern || pattern;

				// Don’t cache length as it changes during the loop
				for (var i=0, pos = 0; i<strarr.length; pos += strarr[i].length, ++i) {

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						break tokenloop;
					}

					if (str instanceof Token) {
						continue;
					}

					pattern.lastIndex = 0;

					var match = pattern.exec(str),
					    delNum = 1;

					// Greedy patterns can override/remove up to two previously matched tokens
					if (!match && greedy && i != strarr.length - 1) {
						pattern.lastIndex = pos;
						match = pattern.exec(text);
						if (!match) {
							break;
						}

						var from = match.index + (lookbehind ? match[1].length : 0),
						    to = match.index + match[0].length,
						    k = i,
						    p = pos;

						for (var len = strarr.length; k < len && p < to; ++k) {
							p += strarr[k].length;
							// Move the index i to the element in strarr that is closest to from
							if (from >= p) {
								++i;
								pos = p;
							}
						}

						/*
						 * If strarr[i] is a Token, then the match starts inside another Token, which is invalid
						 * If strarr[k - 1] is greedy we are in conflict with another greedy pattern
						 */
						if (strarr[i] instanceof Token || strarr[k - 1].greedy) {
							continue;
						}

						// Number of tokens to delete and replace with the new match
						delNum = k - i;
						str = text.slice(pos, p);
						match.index -= pos;
					}

					if (!match) {
						continue;
					}

					if(lookbehind) {
						lookbehindLength = match[1].length;
					}

					var from = match.index + lookbehindLength,
					    match = match[0].slice(lookbehindLength),
					    to = from + match.length,
					    before = str.slice(0, from),
					    after = str.slice(to);

					var args = [i, delNum];

					if (before) {
						args.push(before);
					}

					var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

					args.push(wrapped);

					if (after) {
						args.push(after);
					}

					Array.prototype.splice.apply(strarr, args);
				}
			}
		}

		return strarr;
	},

	hooks: {
		all: {},

		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	}
};

var Token = _.Token = function(type, content, alias, matchedStr, greedy) {
	this.type = type;
	this.content = content;
	this.alias = alias;
	// Copy of the full string this token was created from
	this.length = (matchedStr || "").length|0;
	this.greedy = !!greedy;
};

Token.stringify = function(o, language, parent) {
	if (typeof o == 'string') {
		return o;
	}

	if (_.util.type(o) === 'Array') {
		return o.map(function(element) {
			return Token.stringify(element, language, o);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language, parent),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language,
		parent: parent
	};

	if (env.type == 'comment') {
		env.attributes['spellcheck'] = 'true';
	}

	if (o.alias) {
		var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = Object.keys(env.attributes).map(function(name) {
		return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
	}).join(' ');

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';

};

if (!_self.document) {
	if (!_self.addEventListener) {
		// in Node.js
		return _self.Prism;
	}
 	// In worker
	_self.addEventListener('message', function(evt) {
		var message = JSON.parse(evt.data),
		    lang = message.language,
		    code = message.code,
		    immediateClose = message.immediateClose;

		_self.postMessage(_.highlight(code, _.languages[lang], lang));
		if (immediateClose) {
			_self.close();
		}
	}, false);

	return _self.Prism;
}

//Get current script and highlight
var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

if (script) {
	_.filename = script.src;

	if (document.addEventListener && !script.hasAttribute('data-manual')) {
		if(document.readyState !== "loading") {
			if (window.requestAnimationFrame) {
				window.requestAnimationFrame(_.highlightAll);
			} else {
				window.setTimeout(_.highlightAll, 16);
			}
		}
		else {
			document.addEventListener('DOMContentLoaded', _.highlightAll);
		}
	}
}

return _self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
	global.Prism = Prism;
}


/* **********************************************
     Begin prism-markup.js
********************************************** */

Prism.languages.markup = {
	'comment': /\x3c!--[\w\W]*?--\x3e/,
	'prolog': /<\?[\w\W]+?\?>/,
	'doctype': /<!DOCTYPE[\w\W]+?>/i,
	'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\w\W])*\1|[^\s'">=]+))?)*\s*\/?>/i,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'attr-value': {
				pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
				inside: {
					'punctuation': /[=>"']/
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': /&#?[\da-z]{1,8};/i
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;


/* **********************************************
     Begin prism-css.js
********************************************** */

Prism.languages.css = {
	'comment': /\/\*[\w\W]*?\*\//,
	'atrule': {
		pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
		inside: {
			'rule': /@[\w-]+/
			// See rest below
		}
	},
	'url': /url\((?:(["'])(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
	'selector': /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
	'string': {
		pattern: /("|')(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'property': /(\b|\B)[\w-]+(?=\s*:)/i,
	'important': /\B!important\b/i,
	'function': /[-a-z0-9]+(?=\()/i,
	'punctuation': /[(){};:]/
};

Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'style': {
			pattern: /(<style[\w\W]*?>)[\w\W]*?(?=<\/style>)/i,
			lookbehind: true,
			inside: Prism.languages.css,
			alias: 'language-css'
		}
	});
	
	Prism.languages.insertBefore('inside', 'attr-value', {
		'style-attr': {
			pattern: /\s*style=("|').*?\1/i,
			inside: {
				'attr-name': {
					pattern: /^\s*style/i,
					inside: Prism.languages.markup.tag.inside
				},
				'punctuation': /^\s*=\s*['"]|['"]\s*$/,
				'attr-value': {
					pattern: /.+/i,
					inside: Prism.languages.css
				}
			},
			alias: 'language-css'
		}
	}, Prism.languages.markup.tag);
}

/* **********************************************
     Begin prism-clike.js
********************************************** */

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true
		}
	],
	'string': {
		pattern: /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'class-name': {
		pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
		lookbehind: true,
		inside: {
			punctuation: /(\.|\\)/
		}
	},
	'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
	'boolean': /\b(true|false)\b/,
	'function': /[a-z0-9_]+(?=\()/i,
	'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
	'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
	'punctuation': /[{}[\];(),.:]/
};


/* **********************************************
     Begin prism-javascript.js
********************************************** */

Prism.languages.javascript = Prism.languages.extend('clike', {
	'keyword': /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/,
	'number': /\b-?(0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/,
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\()/i,
	'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*\*?|\/|~|\^|%|\.{3}/
});

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
		lookbehind: true,
		greedy: true
	}
});

Prism.languages.insertBefore('javascript', 'string', {
	'template-string': {
		pattern: /`(?:\\\\|\\?[^\\])*?`/,
		greedy: true,
		inside: {
			'interpolation': {
				pattern: /\$\{[^}]+\}/,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\$\{|\}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	}
});

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'script': {
			pattern: /(<script[\w\W]*?>)[\w\W]*?(?=<\/script>)/i,
			lookbehind: true,
			inside: Prism.languages.javascript,
			alias: 'language-javascript'
		}
	});
}

Prism.languages.js = Prism.languages.javascript;

/* **********************************************
     Begin prism-file-highlight.js
********************************************** */

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
		return;
	}

	self.Prism.fileHighlight = function() {

		var Extensions = {
			'js': 'javascript',
			'py': 'python',
			'rb': 'ruby',
			'ps1': 'powershell',
			'psm1': 'powershell',
			'sh': 'bash',
			'bat': 'batch',
			'h': 'c',
			'tex': 'latex'
		};

		if(Array.prototype.forEach) { // Check to prevent error in IE8
			Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function (pre) {
				var src = pre.getAttribute('data-src');

				var language, parent = pre;
				var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
				while (parent && !lang.test(parent.className)) {
					parent = parent.parentNode;
				}

				if (parent) {
					language = (pre.className.match(lang) || [, ''])[1];
				}

				if (!language) {
					var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
					language = Extensions[extension] || extension;
				}

				var code = document.createElement('code');
				code.className = 'language-' + language;

				pre.textContent = '';

				code.textContent = 'Loading…';

				pre.appendChild(code);

				var xhr = new XMLHttpRequest();

				xhr.open('GET', src, true);

				xhr.onreadystatechange = function () {
					if (xhr.readyState == 4) {

						if (xhr.status < 400 && xhr.responseText) {
							code.textContent = xhr.responseText;

							Prism.highlightElement(code);
						}
						else if (xhr.status >= 400) {
							code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
						}
						else {
							code.textContent = '✖ Error: File does not exist or is empty';
						}
					}
				};

				xhr.send(null);
			});
		}

	};

	document.addEventListener('DOMContentLoaded', self.Prism.fileHighlight);

})();
(function() {
  if (typeof Object.assign !== 'function') {
    (function() {
      Object.assign = function(target) {
        'use strict';
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }
        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey];
              }
            }
          }
        }
        return output;
      };
    })();
  }

  window.RamlBehaviors = window.RamlBehaviors || {};
  /**
   * Use `RamlBehaviors.DocsParametersBehavior` to implement a custom element
   * that is rendering a parameters table in the RAML documentation view.
   * @polymerBehavior RamlBehaviors.DocsParametersBehavior
   */
  window.RamlBehaviors.DocsParametersBehavior = {
    properties: {
      // If set automatically hides the element which doesn't have parameteres set
      autoHide: {
        type: Boolean,
        value: false
      },
      // RAML base types
      baseTypes: {
        type: Array,
        value: function() {
          return ['object', 'array','integer', 'string','number','boolean',
            'datetime','file', 'null','any'];
        }
      },
      /**
       * A list of examples in the definition.
       * This is a computed value for both `example` and `examples` properties.
       *
       * This is not computed automatically. Set the type object change observer. See the
       * `_computeExamples()` function for more information.
       *
       * If you see this documentation it means that the element that implements this behavior is
       * not using examples and it's not relevant for this element.
       */
      examples: Array,
      // Computed value if current type has examples.
      hasExamples: {
        type: Boolean,
        value: false,
        notify: true,
        computed: '_computeHasExamples(examples.*)'
      },
    },
    /**
     * Check if passed object is not empty.
     * 0 (zero) returns true while empty string returns false.
     *
     * @return {Boolean} True/False depending if passed object has a value.
     */
    hasValue: function(obj) {
      if (typeof obj === 'number' && obj === 0) {
        return true;
      }
      if (typeof obj === 'boolean') {
        return true;
      }
      return !!obj;
    },
    /**
     * in RAML `properties` property of the type object is an object.
     * To make it useful while itereing using `dom-repeat` this function
     * produces an array of objects. Object content is the same as
     * RAML parser's. Object's key is the same as the `name` property in the
     * object.
     *
     * ## Example
     * Source object:
     * ```javascript
     *  properties: {
     *    available: {
     *      description: 'description',
     *      displayName: 'available',
     *      name: 'available',
     *      required: true
     *    }
     *  }
     * ```
     * becomes:
     * ```javascript
     *  properties: [
     *    {
     *      description: 'description',
     *      displayName: 'available',
     *      name: 'available',
     *      required: true
     *    }
     *  ]
     * ```
     * @param {Object} obj The original RAML parser properties value.
     * @return {Array}
     */
    readProperties: function(obj) {
      if (!obj) {
        return [];
      }
      if (obj instanceof Array) {
        return obj;
      }
      var names = Object.getOwnPropertyNames(obj);
      if (!names) {
        return [];
      }
      return names.map(function(i) { return obj[i]; });
    },

    _computeEnumValue: function(enumValue) {
      if (!enumValue || !enumValue.length) {
        return '';
      }
      enumValue = enumValue.map(function(item) {
        if (typeof item === 'string') {
          if (item === '') {
            return '""';
          }
          return item;
        }
        return item.displayName || item.name || item.key;
      });
      return enumValue.join(', ');
    },

    /**
     * Computes list of examples.
     * This function to be used with object sub-properties observer:
     * ```
     * examples: {
     *   type: Array,
     *   computed: '_computeExamples(type.*)'
     * }
     * ```
     * or in the observers list.
     */
    _computeExamples: function(record) {
      var object = record.base;
      if (!object) {
        return undefined;
      }
      if (object.examples && object.examples.length) {
        return object.examples;
      }
      if (object.example) {
        if (typeof object.example === 'string') {
          return [object.example];
        } else {
          return [JSON.stringify(object.example, null, 2)];
        }
      }
      return undefined;
    },
    // Computes boolean value when the `examples` property change.
    _computeHasExamples: function(record) {
      var object = record.base;
      if (!object) {
        return false;
      }
      return !!object.length;
    }
  };
})();
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /\x3c!--[\s\S]*?--\x3e/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^\x3c!--[\s\S]*?--\x3e|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
	// explicitly match decimal, hex, and named HTML entities 
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
'use strict';

  Polymer({

    is: 'marked-element',

    properties: {

      /**
       * The markdown source that should be rendered by this element.
       */
      markdown: {
        observer: 'render',
        type: String,
        value: null
      },
      /**
       * Conform to obscure parts of markdown.pl as much as possible. Don't fix any of the original markdown bugs or poor behavior.
       */
      pedantic: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Function used to customize a renderer based on the [API specified in the Marked
       * library](https://github.com/chjj/marked#overriding-renderer-methods).
       * It takes one argument: a marked renderer object, which is mutated by the function.
       */
      renderer: {
        observer: 'render',
        type: Function,
        value: null
      },
      /**
       * Sanitize the output. Ignore any HTML that has been input.
       */
      sanitize: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Use "smart" typographic punctuation for things like quotes and dashes.
       */
      smartypants: {
        observer: 'render',
        type: Boolean,
        value: false
      },
      /**
       * Callback function invoked by Marked after HTML has been rendered.
       * It must take two arguments: err and text and must return the resulting text.
       */
      callback: {
        observer: 'render',
        type: Function,
        value: null
      }
    },

    ready: function() {
      if (!this.markdown) {
        // Use the Markdown from the first `<script>` descendant whose MIME type starts with
        // "text/markdown". Script elements beyond the first are ignored.
        var markdownElement = Polymer.dom(this).querySelector('[type^="text/markdown"]');
        if (markdownElement != null) {
          this.markdown = this._unindent(markdownElement.textContent);
        }
      }
    },

    /**
     * Renders `markdown` to HTML when the element is attached.
     *
     * This serves a dual purpose:
     *
     *  * Prevents unnecessary work (no need to render when not visible).
     *
     *  * `attached` fires top-down, so we can give ancestors a chance to
     *    register listeners for the `syntax-highlight` event _before_ we render
     *    any markdown.
     *
     */
    attached: function() {
      this._attached = true;
      this._outputElement = this.outputElement;
      this.render();
    },

    detached: function() {
      this._attached = false;
    },

    /**
     * Unindents the markdown source that will be rendered.
     */
    unindent: function(text) {
      return this._unindent(text);
    },

    get outputElement () {
      var child = Polymer.dom(this).queryDistributedElements('.markdown-html')[0];

      if (child)
        return child;

      this.toggleClass('hidden', false, this.$.content);
      return this.$.content;
    },

    /**
     * The `marked-render-complete` event is fired once Markdown to HTML
     * conversion has finished, and the DOM has been populated via the resulting
     * HTML.
     *
     * @event marked-render-complete
     */

    /**
     * Renders `markdown` into this element's DOM.
     *
     * This is automatically called whenever the `markdown` property is changed.
     *
     * The only case where you should be calling this is if you are providing
     * markdown via `<script type="text/markdown">` after this element has been
     * constructed (or updating that markdown).
     */
    render: function() {
      if (!this._attached) return;
      if (!this.markdown) {
        Polymer.dom(this._outputElement).innerHTML = '';
        return;
      }
      var renderer = new marked.Renderer();
      if (this.renderer) {
        this.renderer(renderer);
      }
      var opts = {
        renderer: renderer,
        highlight: this._highlight.bind(this),
        sanitize: this.sanitize,
        pedantic: this.pedantic,
        smartypants: this.smartypants
      };
      Polymer.dom(this._outputElement).innerHTML = marked(this.markdown, opts, this.callback);
      this.fire('marked-render-complete');
    },

    _highlight: function(code, lang) {
      var event = this.fire('syntax-highlight', {code: code, lang: lang});
      return event.detail.code || code;
    },

    _unindent: function(text) {
      if (!text) return text;
      var lines  = text.replace(/\t/g, '  ').split('\n');
      var indent = lines.reduce(function(prev, line) {
        if (/^\s*$/.test(line)) return prev;  // Completely ignore blank lines.

        var lineIndent = line.match(/^(\s*)/)[0].length;
        if (prev === null) return lineIndent;
        return lineIndent < prev ? lineIndent : prev;
      }, null);

      return lines.map(function(l) { return l.substr(indent); }).join('\n');
    }

  });
Polymer({
    is: 'docs-parameters-table',

    behaviors: [RamlBehaviors.DocsParametersBehavior],

    properties: {
      /**
       * The RAML's URI parameters object.
       * See overview for object details.
       */
      uriParameters: Object,
      /**
       * The RAML's query parameters object.
       * See overview for object details.
       */
      queryParameters: Object,
      // True when `uriParameters` are present
      hasUriParameteres: {
        type: Boolean,
        computed: '_computeHasUriParameteres(uriParameters.*)',
        value: false,
        notify: true
      },
      // True when `queryParameters` are present
      hasQueryParameteres: {
        type: Boolean,
        computed: '_computeHasQueryParameteres(queryParameters.*)',
        value: false,
        notify: true
      },
      // True if it has either `uriParameteres` or `queryParameteres`
      hasParameters: {
        type: Boolean,
        computed: '_computeHasParameteres(hasQueryParameteres, hasUriParameteres)',
        value: false,
        notify: true
      },
      // If set automatically hides the element which doesn't have parameteres set
      autoHide: {
        type: Boolean,
        value: false
      },
      // Computed uriParameters array
      displayUriParameters: {
        type: Array,
        computed: '_computeProperty(uriParameters.*)'
      },
      // Computed uriParameters array
      displayQueryParameters: {
        type: Array,
        computed: '_computeProperty(queryParameters.*)'
      }
    },

    observers: [
      '_autoHide(autoHide, hasQueryParameteres, hasUriParameteres)'
    ],

    _computeHasUriParameteres: function() {
      return !!(this.uriParameters && Object.keys(this.uriParameters).length);
    },

    _computeHasQueryParameteres: function() {
      return !!(this.queryParameters && Object.keys(this.queryParameters).length);
    },

    _autoHide: function(autoHide, hasQueryParameteres, hasUriParameteres) {
      if (!autoHide) {
        return;
      }
      if (hasQueryParameteres || hasUriParameteres) {
        this.removeAttribute('hidden');
      } else {
        this.setAttribute('hidden', true);
      }
    },

    _computeProperty: function(record) {
      if (record.path in this) {
        return this.readProperties(this[record.path]);
      }
      return [];
    },

    _computeEnumValue: function(enumValue) {
      if (!enumValue || !enumValue.length) {
        return '';
      }
      enumValue = enumValue.map(function(item) {
        if (typeof item === 'string') {
          return item;
        }
        return item.displayName || item.name || item.key;
      });
      return enumValue.join(', ');
    },

    // Computes if any of arguments is trully
    _computeHasParameteres: function(hasQueryParameteres, hasUriParameteres) {
      return !!(hasQueryParameteres || hasUriParameteres);
    }
  });
Polymer({
    is: 'docs-headers-table',

    behaviors: [RamlBehaviors.DocsParametersBehavior],

    properties: {
      /**
       * The RAML's headers description object.
       * See overview for object details.
       */
      headers: Array,
      // True when `headers` are present
      hasHeaders: {
        type: Boolean,
        computed: '_computeHasHeaders(headers.*)',
        value: false,
        notify: true
      }
    },

    observers: [
      '_autoHide(autoHide, hasHeaders)'
    ],

    _computeHasHeaders: function() {
      return !!(this.headers && Object.keys(this.headers).length);
    },

    _autoHide: function(autoHide, hasHeaders) {
      if (!autoHide) {
        return;
      }
      if (hasHeaders) {
        this.removeAttribute('hidden');
      } else {
        this.setAttribute('hidden', true);
      }
    }
  });
(function() {

  'use strict';

  var HIGHLIGHT_EVENT = 'syntax-highlight';

  Polymer({

    is: 'prism-highlighter',
    
    properties: {
      /**
       * Adds languages outside of the core Prism languages.
       *
       * Prism includes a few languages in the core library:
       *   - JavaScript
       *   - Markup
       *   - CSS
       *   - C-Like
       * Use this property to extend the core set with other Prism
       * components and custom languages.
       *
       * Example:
       *   ```
       *   <!-- with languages = {'custom': myCustomPrismLang}; -->
       *   <!-- or languages = Prism.languages; -->
       *   <prism-highlighter languages="[[languages]]"></prism-highlighter>
       *   ```
       *
       * @attribute languages
       * @type {!Object}
       */
      languages: {
        type: Object,
        value: function() {
          return {};
        }
      }
    },

    ready: function() {
      this._handler = this._highlight.bind(this);
    },

    attached: function() {
      (this.parentElement || this.parentNode.host).addEventListener(HIGHLIGHT_EVENT, this._handler);
    },

    detached: function() {
      (this.parentElement || this.parentNode.host).removeEventListener(HIGHLIGHT_EVENT, this._handler);
    },

    /**
     * Handle the highlighting event, if we can.
     *
     * @param {!CustomEvent} event
     */
    _highlight: function(event) {
      if (!event.detail || !event.detail.code) {
        Polymer.Base._warn('Malformed', HIGHLIGHT_EVENT, 'event:', event.detail);
        return;
      }

      event.stopPropagation();

      var detail = event.detail;
      detail.code = Prism.highlight(detail.code, this._detectLang(detail.code, detail.lang));
    },

    /**
     * Picks a Prism formatter based on the `lang` hint and `code`.
     *
     * @param {string} code The source being highlighted.
     * @param {string=} lang A language hint (e.g. ````LANG`).
     * @return {!prism.Lang}
     */
    _detectLang: function(code, lang) {
      if (!lang) {
        // Stupid simple detection if we have no lang, courtesy of:
        // https://github.com/robdodson/mark-down/blob/ac2eaa/mark-down.html#L93-101
        return code.match(/^\s*</) ? Prism.languages.markup : Prism.languages.javascript;
      }

      if (this.languages[lang]) {
        return this.languages[lang];
      } else if (Prism.languages[lang]) {
        return Prism.languages[lang];
      }
      switch (lang.substr(0, 2)) {
        case 'js':
        case 'es':
          return Prism.languages.javascript;
        case 'c':
          return Prism.languages.clike;
        default:
          // The assumption is that you're mostly documenting HTML when in HTML.
          return Prism.languages.markup;
      }
    },

  });

})();
/**
   * @param {!Function} selectCallback
   * @constructor
   */
  Polymer.IronSelection = function(selectCallback) {
    this.selection = [];
    this.selectCallback = selectCallback;
  };

  Polymer.IronSelection.prototype = {

    /**
     * Retrieves the selected item(s).
     *
     * @method get
     * @returns Returns the selected item(s). If the multi property is true,
     * `get` will return an array, otherwise it will return
     * the selected item or undefined if there is no selection.
     */
    get: function() {
      return this.multi ? this.selection.slice() : this.selection[0];
    },

    /**
     * Clears all the selection except the ones indicated.
     *
     * @method clear
     * @param {Array} excludes items to be excluded.
     */
    clear: function(excludes) {
      this.selection.slice().forEach(function(item) {
        if (!excludes || excludes.indexOf(item) < 0) {
          this.setItemSelected(item, false);
        }
      }, this);
    },

    /**
     * Indicates if a given item is selected.
     *
     * @method isSelected
     * @param {*} item The item whose selection state should be checked.
     * @returns Returns true if `item` is selected.
     */
    isSelected: function(item) {
      return this.selection.indexOf(item) >= 0;
    },

    /**
     * Sets the selection state for a given item to either selected or deselected.
     *
     * @method setItemSelected
     * @param {*} item The item to select.
     * @param {boolean} isSelected True for selected, false for deselected.
     */
    setItemSelected: function(item, isSelected) {
      if (item != null) {
        if (isSelected !== this.isSelected(item)) {
          // proceed to update selection only if requested state differs from current
          if (isSelected) {
            this.selection.push(item);
          } else {
            var i = this.selection.indexOf(item);
            if (i >= 0) {
              this.selection.splice(i, 1);
            }
          }
          if (this.selectCallback) {
            this.selectCallback(item, isSelected);
          }
        }
      }
    },

    /**
     * Sets the selection state for a given item. If the `multi` property
     * is true, then the selected state of `item` will be toggled; otherwise
     * the `item` will be selected.
     *
     * @method select
     * @param {*} item The item to select.
     */
    select: function(item) {
      if (this.multi) {
        this.toggle(item);
      } else if (this.get() !== item) {
        this.setItemSelected(this.get(), false);
        this.setItemSelected(item, true);
      }
    },

    /**
     * Toggles the selection state for `item`.
     *
     * @method toggle
     * @param {*} item The item to toggle.
     */
    toggle: function(item) {
      this.setItemSelected(item, !this.isSelected(item));
    }

  };
/** @polymerBehavior */
  Polymer.IronSelectableBehavior = {

      /**
       * Fired when iron-selector is activated (selected or deselected).
       * It is fired before the selected items are changed.
       * Cancel the event to abort selection.
       *
       * @event iron-activate
       */

      /**
       * Fired when an item is selected
       *
       * @event iron-select
       */

      /**
       * Fired when an item is deselected
       *
       * @event iron-deselect
       */

      /**
       * Fired when the list of selectable items changes (e.g., items are
       * added or removed). The detail of the event is a mutation record that
       * describes what changed.
       *
       * @event iron-items-changed
       */

    properties: {

      /**
       * If you want to use an attribute value or property of an element for
       * `selected` instead of the index, set this to the name of the attribute
       * or property. Hyphenated values are converted to camel case when used to
       * look up the property of a selectable element. Camel cased values are
       * *not* converted to hyphenated values for attribute lookup. It's
       * recommended that you provide the hyphenated form of the name so that
       * selection works in both cases. (Use `attr-or-property-name` instead of
       * `attrOrPropertyName`.)
       */
      attrForSelected: {
        type: String,
        value: null
      },

      /**
       * Gets or sets the selected element. The default is to use the index of the item.
       * @type {string|number}
       */
      selected: {
        type: String,
        notify: true
      },

      /**
       * Returns the currently selected item.
       *
       * @type {?Object}
       */
      selectedItem: {
        type: Object,
        readOnly: true,
        notify: true
      },

      /**
       * The event that fires from items when they are selected. Selectable
       * will listen for this event from items and update the selection state.
       * Set to empty string to listen to no events.
       */
      activateEvent: {
        type: String,
        value: 'tap',
        observer: '_activateEventChanged'
      },

      /**
       * This is a CSS selector string.  If this is set, only items that match the CSS selector
       * are selectable.
       */
      selectable: String,

      /**
       * The class to set on elements when selected.
       */
      selectedClass: {
        type: String,
        value: 'iron-selected'
      },

      /**
       * The attribute to set on elements when selected.
       */
      selectedAttribute: {
        type: String,
        value: null
      },

      /**
       * Default fallback if the selection based on selected with `attrForSelected`
       * is not found.
       */
      fallbackSelection: {
        type: String,
        value: null
      },

      /**
       * The list of items from which a selection can be made.
       */
      items: {
        type: Array,
        readOnly: true,
        notify: true,
        value: function() {
          return [];
        }
      },

      /**
       * The set of excluded elements where the key is the `localName`
       * of the element that will be ignored from the item list.
       *
       * @default {template: 1}
       */
      _excludedLocalNames: {
        type: Object,
        value: function() {
          return {
            'template': 1
          };
        }
      }
    },

    observers: [
      '_updateAttrForSelected(attrForSelected)',
      '_updateSelected(selected)',
      '_checkFallback(fallbackSelection)'
    ],

    created: function() {
      this._bindFilterItem = this._filterItem.bind(this);
      this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
    },

    attached: function() {
      this._observer = this._observeItems(this);
      this._updateItems();
      if (!this._shouldUpdateSelection) {
        this._updateSelected();
      }
      this._addListener(this.activateEvent);
    },

    detached: function() {
      if (this._observer) {
        Polymer.dom(this).unobserveNodes(this._observer);
      }
      this._removeListener(this.activateEvent);
    },

    /**
     * Returns the index of the given item.
     *
     * @method indexOf
     * @param {Object} item
     * @returns Returns the index of the item
     */
    indexOf: function(item) {
      return this.items.indexOf(item);
    },

    /**
     * Selects the given value.
     *
     * @method select
     * @param {string|number} value the value to select.
     */
    select: function(value) {
      this.selected = value;
    },

    /**
     * Selects the previous item.
     *
     * @method selectPrevious
     */
    selectPrevious: function() {
      var length = this.items.length;
      var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
      this.selected = this._indexToValue(index);
    },

    /**
     * Selects the next item.
     *
     * @method selectNext
     */
    selectNext: function() {
      var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
      this.selected = this._indexToValue(index);
    },

    /**
     * Selects the item at the given index.
     *
     * @method selectIndex
     */
    selectIndex: function(index) {
      this.select(this._indexToValue(index));
    },

    /**
     * Force a synchronous update of the `items` property.
     *
     * NOTE: Consider listening for the `iron-items-changed` event to respond to
     * updates to the set of selectable items after updates to the DOM list and
     * selection state have been made.
     *
     * WARNING: If you are using this method, you should probably consider an
     * alternate approach. Synchronously querying for items is potentially
     * slow for many use cases. The `items` property will update asynchronously
     * on its own to reflect selectable items in the DOM.
     */
    forceSynchronousItemUpdate: function() {
      this._updateItems();
    },

    get _shouldUpdateSelection() {
      return this.selected != null;
    },

    _checkFallback: function() {
      if (this._shouldUpdateSelection) {
        this._updateSelected();
      }
    },

    _addListener: function(eventName) {
      this.listen(this, eventName, '_activateHandler');
    },

    _removeListener: function(eventName) {
      this.unlisten(this, eventName, '_activateHandler');
    },

    _activateEventChanged: function(eventName, old) {
      this._removeListener(old);
      this._addListener(eventName);
    },

    _updateItems: function() {
      var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
      nodes = Array.prototype.filter.call(nodes, this._bindFilterItem);
      this._setItems(nodes);
    },

    _updateAttrForSelected: function() {
      if (this._shouldUpdateSelection) {
        this.selected = this._indexToValue(this.indexOf(this.selectedItem));
      }
    },

    _updateSelected: function() {
      this._selectSelected(this.selected);
    },

    _selectSelected: function(selected) {
      this._selection.select(this._valueToItem(this.selected));
      // Check for items, since this array is populated only when attached
      // Since Number(0) is falsy, explicitly check for undefined
      if (this.fallbackSelection && this.items.length && (this._selection.get() === undefined)) {
        this.selected = this.fallbackSelection;
      }
    },

    _filterItem: function(node) {
      return !this._excludedLocalNames[node.localName];
    },

    _valueToItem: function(value) {
      return (value == null) ? null : this.items[this._valueToIndex(value)];
    },

    _valueToIndex: function(value) {
      if (this.attrForSelected) {
        for (var i = 0, item; item = this.items[i]; i++) {
          if (this._valueForItem(item) == value) {
            return i;
          }
        }
      } else {
        return Number(value);
      }
    },

    _indexToValue: function(index) {
      if (this.attrForSelected) {
        var item = this.items[index];
        if (item) {
          return this._valueForItem(item);
        }
      } else {
        return index;
      }
    },

    _valueForItem: function(item) {
      var propValue = item[Polymer.CaseMap.dashToCamelCase(this.attrForSelected)];
      return propValue != undefined ? propValue : item.getAttribute(this.attrForSelected);
    },

    _applySelection: function(item, isSelected) {
      if (this.selectedClass) {
        this.toggleClass(this.selectedClass, isSelected, item);
      }
      if (this.selectedAttribute) {
        this.toggleAttribute(this.selectedAttribute, isSelected, item);
      }
      this._selectionChange();
      this.fire('iron-' + (isSelected ? 'select' : 'deselect'), {item: item});
    },

    _selectionChange: function() {
      this._setSelectedItem(this._selection.get());
    },

    // observe items change under the given node.
    _observeItems: function(node) {
      return Polymer.dom(node).observeNodes(function(mutation) {
        this._updateItems();

        if (this._shouldUpdateSelection) {
          this._updateSelected();
        }

        // Let other interested parties know about the change so that
        // we don't have to recreate mutation observers everywhere.
        this.fire('iron-items-changed', mutation, {
          bubbles: false,
          cancelable: false
        });
      });
    },

    _activateHandler: function(e) {
      var t = e.target;
      var items = this.items;
      while (t && t != this) {
        var i = items.indexOf(t);
        if (i >= 0) {
          var value = this._indexToValue(i);
          this._itemActivate(value, t);
          return;
        }
        t = t.parentNode;
      }
    },

    _itemActivate: function(value, item) {
      if (!this.fire('iron-activate',
          {selected: value, item: item}, {cancelable: true}).defaultPrevented) {
        this.select(value);
      }
    }

  };
Polymer({

      is: 'iron-pages',

      behaviors: [
        Polymer.IronResizableBehavior,
        Polymer.IronSelectableBehavior
      ],

      properties: {

        // as the selected page is the only one visible, activateEvent
        // is both non-sensical and problematic; e.g. in cases where a user
        // handler attempts to change the page and the activateEvent
        // handler immediately changes it back
        activateEvent: {
          type: String,
          value: null
        }

      },

      observers: [
        '_selectedPageChanged(selected)'
      ],

      _selectedPageChanged: function(selected, old) {
        this.async(this.notifyResize);
      }
    });
/** @polymerBehavior Polymer.IronMultiSelectableBehavior */
  Polymer.IronMultiSelectableBehaviorImpl = {
    properties: {

      /**
       * If true, multiple selections are allowed.
       */
      multi: {
        type: Boolean,
        value: false,
        observer: 'multiChanged'
      },

      /**
       * Gets or sets the selected elements. This is used instead of `selected` when `multi`
       * is true.
       */
      selectedValues: {
        type: Array,
        notify: true
      },

      /**
       * Returns an array of currently selected items.
       */
      selectedItems: {
        type: Array,
        readOnly: true,
        notify: true
      },

    },

    observers: [
      '_updateSelected(selectedValues.splices)'
    ],

    /**
     * Selects the given value. If the `multi` property is true, then the selected state of the
     * `value` will be toggled; otherwise the `value` will be selected.
     *
     * @method select
     * @param {string|number} value the value to select.
     */
    select: function(value) {
      if (this.multi) {
        if (this.selectedValues) {
          this._toggleSelected(value);
        } else {
          this.selectedValues = [value];
        }
      } else {
        this.selected = value;
      }
    },

    multiChanged: function(multi) {
      this._selection.multi = multi;
    },

    get _shouldUpdateSelection() {
      return this.selected != null ||
        (this.selectedValues != null && this.selectedValues.length);
    },

    _updateAttrForSelected: function() {
      if (!this.multi) {
        Polymer.IronSelectableBehavior._updateAttrForSelected.apply(this);
      } else if (this._shouldUpdateSelection) {
        this.selectedValues = this.selectedItems.map(function(selectedItem) {
          return this._indexToValue(this.indexOf(selectedItem));
        }, this).filter(function(unfilteredValue) {
          return unfilteredValue != null;
        }, this);
      }
    },

    _updateSelected: function() {
      if (this.multi) {
        this._selectMulti(this.selectedValues);
      } else {
        this._selectSelected(this.selected);
      }
    },

    _selectMulti: function(values) {
      if (values) {
        var selectedItems = this._valuesToItems(values);
        // clear all but the current selected items
        this._selection.clear(selectedItems);
        // select only those not selected yet
        for (var i = 0; i < selectedItems.length; i++) {
          this._selection.setItemSelected(selectedItems[i], true);
        }
        // Check for items, since this array is populated only when attached
        if (this.fallbackSelection && this.items.length && !this._selection.get().length) {
          var fallback = this._valueToItem(this.fallbackSelection);
          if (fallback) {
            this.selectedValues = [this.fallbackSelection];
          }
        }
      } else {
        this._selection.clear();
      }
    },

    _selectionChange: function() {
      var s = this._selection.get();
      if (this.multi) {
        this._setSelectedItems(s);
      } else {
        this._setSelectedItems([s]);
        this._setSelectedItem(s);
      }
    },

    _toggleSelected: function(value) {
      var i = this.selectedValues.indexOf(value);
      var unselected = i < 0;
      if (unselected) {
        this.push('selectedValues',value);
      } else {
        this.splice('selectedValues',i,1);
      }
    },

    _valuesToItems: function(values) {
      return (values == null) ? null : values.map(function(value) {
        return this._valueToItem(value);
      }, this);
    }
  };

  /** @polymerBehavior */
  Polymer.IronMultiSelectableBehavior = [
    Polymer.IronSelectableBehavior,
    Polymer.IronMultiSelectableBehaviorImpl
  ];
/**
   * `Polymer.IronMenuBehavior` implements accessible menu behavior.
   *
   * @demo demo/index.html
   * @polymerBehavior Polymer.IronMenuBehavior
   */
  Polymer.IronMenuBehaviorImpl = {

    properties: {

      /**
       * Returns the currently focused item.
       * @type {?Object}
       */
      focusedItem: {
        observer: '_focusedItemChanged',
        readOnly: true,
        type: Object
      },

      /**
       * The attribute to use on menu items to look up the item title. Typing the first
       * letter of an item when the menu is open focuses that item. If unset, `textContent`
       * will be used.
       */
      attrForItemTitle: {
        type: String
      }
    },

    _SEARCH_RESET_TIMEOUT_MS: 1000,

    hostAttributes: {
      'role': 'menu',
      'tabindex': '0'
    },

    observers: [
      '_updateMultiselectable(multi)'
    ],

    listeners: {
      'focus': '_onFocus',
      'keydown': '_onKeydown',
      'iron-items-changed': '_onIronItemsChanged'
    },

    keyBindings: {
      'up': '_onUpKey',
      'down': '_onDownKey',
      'esc': '_onEscKey',
      'shift+tab:keydown': '_onShiftTabDown'
    },

    attached: function() {
      this._resetTabindices();
    },

    /**
     * Selects the given value. If the `multi` property is true, then the selected state of the
     * `value` will be toggled; otherwise the `value` will be selected.
     *
     * @param {string|number} value the value to select.
     */
    select: function(value) {
      // Cancel automatically focusing a default item if the menu received focus
      // through a user action selecting a particular item.
      if (this._defaultFocusAsync) {
        this.cancelAsync(this._defaultFocusAsync);
        this._defaultFocusAsync = null;
      }
      var item = this._valueToItem(value);
      if (item && item.hasAttribute('disabled')) return;
      this._setFocusedItem(item);
      Polymer.IronMultiSelectableBehaviorImpl.select.apply(this, arguments);
    },

    /**
     * Resets all tabindex attributes to the appropriate value based on the
     * current selection state. The appropriate value is `0` (focusable) for
     * the default selected item, and `-1` (not keyboard focusable) for all
     * other items.
     */
    _resetTabindices: function() {
      var selectedItem = this.multi ? (this.selectedItems && this.selectedItems[0]) : this.selectedItem;

      this.items.forEach(function(item) {
        item.setAttribute('tabindex', item === selectedItem ? '0' : '-1');
      }, this);
    },

    /**
     * Sets appropriate ARIA based on whether or not the menu is meant to be
     * multi-selectable.
     *
     * @param {boolean} multi True if the menu should be multi-selectable.
     */
    _updateMultiselectable: function(multi) {
      if (multi) {
        this.setAttribute('aria-multiselectable', 'true');
      } else {
        this.removeAttribute('aria-multiselectable');
      }
    },

    /**
     * Given a KeyboardEvent, this method will focus the appropriate item in the
     * menu (if there is a relevant item, and it is possible to focus it).
     *
     * @param {KeyboardEvent} event A KeyboardEvent.
     */
    _focusWithKeyboardEvent: function(event) {
      this.cancelDebouncer('_clearSearchText');

      var searchText = this._searchText || '';
      var key = event.key && event.key.length == 1 ? event.key :
          String.fromCharCode(event.keyCode);
      searchText += key.toLocaleLowerCase();

      var searchLength = searchText.length;

      for (var i = 0, item; item = this.items[i]; i++) {
        if (item.hasAttribute('disabled')) {
          continue;
        }

        var attr = this.attrForItemTitle || 'textContent';
        var title = (item[attr] || item.getAttribute(attr) || '').trim();

        if (title.length < searchLength) {
          continue;
        }

        if (title.slice(0, searchLength).toLocaleLowerCase() == searchText) {
          this._setFocusedItem(item);
          break;
        }
      }

      this._searchText = searchText;
      this.debounce('_clearSearchText', this._clearSearchText,
                    this._SEARCH_RESET_TIMEOUT_MS);
    },

    _clearSearchText: function() {
      this._searchText = '';
    },

    /**
     * Focuses the previous item (relative to the currently focused item) in the
     * menu, disabled items will be skipped.
     * Loop until length + 1 to handle case of single item in menu.
     */
    _focusPrevious: function() {
      var length = this.items.length;
      var curFocusIndex = Number(this.indexOf(this.focusedItem));

      for (var i = 1; i < length + 1; i++) {
        var item = this.items[(curFocusIndex - i + length) % length];
        if (!item.hasAttribute('disabled')) {
          var owner = Polymer.dom(item).getOwnerRoot() || document;
          this._setFocusedItem(item);

          // Focus might not have worked, if the element was hidden or not
          // focusable. In that case, try again.
          if (Polymer.dom(owner).activeElement == item) {
            return;
          }
        }
      }
    },

    /**
     * Focuses the next item (relative to the currently focused item) in the
     * menu, disabled items will be skipped.
     * Loop until length + 1 to handle case of single item in menu.
     */
    _focusNext: function() {
      var length = this.items.length;
      var curFocusIndex = Number(this.indexOf(this.focusedItem));

      for (var i = 1; i < length + 1; i++) {
        var item = this.items[(curFocusIndex + i) % length];
        if (!item.hasAttribute('disabled')) {
          var owner = Polymer.dom(item).getOwnerRoot() || document;
          this._setFocusedItem(item);

          // Focus might not have worked, if the element was hidden or not
          // focusable. In that case, try again.
          if (Polymer.dom(owner).activeElement == item) {
            return;
          }
        }
      }
    },

    /**
     * Mutates items in the menu based on provided selection details, so that
     * all items correctly reflect selection state.
     *
     * @param {Element} item An item in the menu.
     * @param {boolean} isSelected True if the item should be shown in a
     * selected state, otherwise false.
     */
    _applySelection: function(item, isSelected) {
      if (isSelected) {
        item.setAttribute('aria-selected', 'true');
      } else {
        item.removeAttribute('aria-selected');
      }
      Polymer.IronSelectableBehavior._applySelection.apply(this, arguments);
    },

    /**
     * Discretely updates tabindex values among menu items as the focused item
     * changes.
     *
     * @param {Element} focusedItem The element that is currently focused.
     * @param {?Element} old The last element that was considered focused, if
     * applicable.
     */
    _focusedItemChanged: function(focusedItem, old) {
      old && old.setAttribute('tabindex', '-1');
      if (focusedItem) {
        focusedItem.setAttribute('tabindex', '0');
        focusedItem.focus();
      }
    },

    /**
     * A handler that responds to mutation changes related to the list of items
     * in the menu.
     *
     * @param {CustomEvent} event An event containing mutation records as its
     * detail.
     */
    _onIronItemsChanged: function(event) {
      if (event.detail.addedNodes.length) {
        this._resetTabindices();
      }
    },

    /**
     * Handler that is called when a shift+tab keypress is detected by the menu.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onShiftTabDown: function(event) {
      var oldTabIndex = this.getAttribute('tabindex');

      Polymer.IronMenuBehaviorImpl._shiftTabPressed = true;

      this._setFocusedItem(null);

      this.setAttribute('tabindex', '-1');

      this.async(function() {
        this.setAttribute('tabindex', oldTabIndex);
        Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
        // NOTE(cdata): polymer/polymer#1305
      }, 1);
    },

    /**
     * Handler that is called when the menu receives focus.
     *
     * @param {FocusEvent} event A focus event.
     */
    _onFocus: function(event) {
      if (Polymer.IronMenuBehaviorImpl._shiftTabPressed) {
        // do not focus the menu itself
        return;
      }

      // Do not focus the selected tab if the deepest target is part of the
      // menu element's local DOM and is focusable.
      var rootTarget = /** @type {?HTMLElement} */(
          Polymer.dom(event).rootTarget);
      if (rootTarget !== this && typeof rootTarget.tabIndex !== "undefined" && !this.isLightDescendant(rootTarget)) {
        return;
      }

      // clear the cached focus item
      this._defaultFocusAsync = this.async(function() {
        // focus the selected item when the menu receives focus, or the first item
        // if no item is selected
        var selectedItem = this.multi ? (this.selectedItems && this.selectedItems[0]) : this.selectedItem;

        this._setFocusedItem(null);

        if (selectedItem) {
          this._setFocusedItem(selectedItem);
        } else if (this.items[0]) {
          // We find the first none-disabled item (if one exists)
          this._focusNext();
        }
      });
    },

    /**
     * Handler that is called when the up key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onUpKey: function(event) {
      // up and down arrows moves the focus
      this._focusPrevious();
      event.detail.keyboardEvent.preventDefault();
    },

    /**
     * Handler that is called when the down key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onDownKey: function(event) {
      this._focusNext();
      event.detail.keyboardEvent.preventDefault();
    },

    /**
     * Handler that is called when the esc key is pressed.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onEscKey: function(event) {
      // esc blurs the control
      this.focusedItem.blur();
    },

    /**
     * Handler that is called when a keydown event is detected.
     *
     * @param {KeyboardEvent} event A keyboard event.
     */
    _onKeydown: function(event) {
      if (!this.keyboardEventMatchesKeys(event, 'up down esc')) {
        // all other keys focus the menu item starting with that character
        this._focusWithKeyboardEvent(event);
      }
      event.stopPropagation();
    },

    // override _activateHandler
    _activateHandler: function(event) {
      Polymer.IronSelectableBehavior._activateHandler.call(this, event);
      event.stopPropagation();
    }
  };

  Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;

  /** @polymerBehavior Polymer.IronMenuBehavior */
  Polymer.IronMenuBehavior = [
    Polymer.IronMultiSelectableBehavior,
    Polymer.IronA11yKeysBehavior,
    Polymer.IronMenuBehaviorImpl
  ];
/**
   * `Polymer.IronMenubarBehavior` implements accessible menubar behavior.
   *
   * @polymerBehavior Polymer.IronMenubarBehavior
   */
  Polymer.IronMenubarBehaviorImpl = {

    hostAttributes: {
      'role': 'menubar'
    },

    keyBindings: {
      'left': '_onLeftKey',
      'right': '_onRightKey'
    },

    _onUpKey: function(event) {
      this.focusedItem.click();
      event.detail.keyboardEvent.preventDefault();
    },

    _onDownKey: function(event) {
      this.focusedItem.click();
      event.detail.keyboardEvent.preventDefault();
    },

    get _isRTL() {
      return window.getComputedStyle(this)['direction'] === 'rtl';
    },

    _onLeftKey: function(event) {
      if (this._isRTL) {
        this._focusNext();
      } else {
        this._focusPrevious();
      }
      event.detail.keyboardEvent.preventDefault();
    },

    _onRightKey: function(event) {
      if (this._isRTL) {
        this._focusPrevious();
      } else {
        this._focusNext();
      }
      event.detail.keyboardEvent.preventDefault();
    },

    _onKeydown: function(event) {
      if (this.keyboardEventMatchesKeys(event, 'up down left right esc')) {
        return;
      }

      // all other keys focus the menu item starting with that character
      this._focusWithKeyboardEvent(event);
    }

  };

  /** @polymerBehavior Polymer.IronMenubarBehavior */
  Polymer.IronMenubarBehavior = [
    Polymer.IronMenuBehavior,
    Polymer.IronMenubarBehaviorImpl
  ];
Polymer({
      is: 'paper-tab',

      behaviors: [
        Polymer.IronControlState,
        Polymer.IronButtonState,
        Polymer.PaperRippleBehavior
      ],

      properties: {

        /**
         * If true, the tab will forward keyboard clicks (enter/space) to
         * the first anchor element found in its descendants
         */
        link: {
          type: Boolean,
          value: false,
          reflectToAttribute: true
        }

      },

      hostAttributes: {
        role: 'tab'
      },

      listeners: {
        down: '_updateNoink',
        tap: '_onTap'
      },

      attached: function() {
        this._updateNoink();
      },

      get _parentNoink () {
        var parent = Polymer.dom(this).parentNode;
        return !!parent && !!parent.noink;
      },

      _updateNoink: function() {
        this.noink = !!this.noink || !!this._parentNoink;
      },

      _onTap: function(event) {
        if (this.link) {
          var anchor = this.queryEffectiveChildren('a');

          if (!anchor) {
            return;
          }

          // Don't get stuck in a loop delegating
          // the listener from the child anchor
          if (event.target === anchor) {
            return;
          }

          anchor.click();
        }
      }

    });
Polymer({
      is: 'paper-tabs',

      behaviors: [
        Polymer.IronResizableBehavior,
        Polymer.IronMenubarBehavior
      ],

      properties: {
        /**
         * If true, ink ripple effect is disabled. When this property is changed,
         * all descendant `<paper-tab>` elements have their `noink` property
         * changed to the new value as well.
         */
        noink: {
          type: Boolean,
          value: false,
          observer: '_noinkChanged'
        },

        /**
         * If true, the bottom bar to indicate the selected tab will not be shown.
         */
        noBar: {
          type: Boolean,
          value: false
        },

        /**
         * If true, the slide effect for the bottom bar is disabled.
         */
        noSlide: {
          type: Boolean,
          value: false
        },

        /**
         * If true, tabs are scrollable and the tab width is based on the label width.
         */
        scrollable: {
          type: Boolean,
          value: false
        },

        /**
         * If true, tabs expand to fit their container. This currently only applies when
         * scrollable is true.
         */
        fitContainer: {
          type: Boolean,
          value: false
        },

        /**
         * If true, dragging on the tabs to scroll is disabled.
         */
        disableDrag: {
          type: Boolean,
          value: false
        },

        /**
         * If true, scroll buttons (left/right arrow) will be hidden for scrollable tabs.
         */
        hideScrollButtons: {
          type: Boolean,
          value: false
        },

        /**
         * If true, the tabs are aligned to bottom (the selection bar appears at the top).
         */
        alignBottom: {
          type: Boolean,
          value: false
        },

        selectable: {
          type: String,
          value: 'paper-tab'
        },

        /**
         * If true, tabs are automatically selected when focused using the
         * keyboard.
         */
        autoselect: {
          type: Boolean,
          value: false
        },

        /**
         * The delay (in milliseconds) between when the user stops interacting
         * with the tabs through the keyboard and when the focused item is
         * automatically selected (if `autoselect` is true).
         */
        autoselectDelay: {
          type: Number,
          value: 0
        },

        _step: {
          type: Number,
          value: 10
        },

        _holdDelay: {
          type: Number,
          value: 1
        },

        _leftHidden: {
          type: Boolean,
          value: false
        },

        _rightHidden: {
          type: Boolean,
          value: false
        },

        _previousTab: {
          type: Object
        }
      },

      hostAttributes: {
        role: 'tablist'
      },

      listeners: {
        'iron-resize': '_onTabSizingChanged',
        'iron-items-changed': '_onTabSizingChanged',
        'iron-select': '_onIronSelect',
        'iron-deselect': '_onIronDeselect'
      },

      keyBindings: {
        'left:keyup right:keyup': '_onArrowKeyup'
      },

      created: function() {
        this._holdJob = null;
        this._pendingActivationItem = undefined;
        this._pendingActivationTimeout = undefined;
        this._bindDelayedActivationHandler = this._delayedActivationHandler.bind(this);
        this.addEventListener('blur', this._onBlurCapture.bind(this), true);
      },

      ready: function() {
        this.setScrollDirection('y', this.$.tabsContainer);
      },

      detached: function() {
        this._cancelPendingActivation();
      },

      _noinkChanged: function(noink) {
        var childTabs = Polymer.dom(this).querySelectorAll('paper-tab');
        childTabs.forEach(noink ? this._setNoinkAttribute : this._removeNoinkAttribute);
      },

      _setNoinkAttribute: function(element) {
        element.setAttribute('noink', '');
      },

      _removeNoinkAttribute: function(element) {
        element.removeAttribute('noink');
      },

      _computeScrollButtonClass: function(hideThisButton, scrollable, hideScrollButtons) {
        if (!scrollable || hideScrollButtons) {
          return 'hidden';
        }

        if (hideThisButton) {
          return 'not-visible';
        }

        return '';
      },

      _computeTabsContentClass: function(scrollable, fitContainer) {
        return scrollable ? 'scrollable' + (fitContainer ? ' fit-container' : '') : ' fit-container';
      },

      _computeSelectionBarClass: function(noBar, alignBottom) {
        if (noBar) {
          return 'hidden';
        } else if (alignBottom) {
          return 'align-bottom';
        }

        return '';
      },

      // TODO(cdata): Add `track` response back in when gesture lands.

      _onTabSizingChanged: function() {
        this.debounce('_onTabSizingChanged', function() {
          this._scroll();
          this._tabChanged(this.selectedItem);
        }, 10);
      },

      _onIronSelect: function(event) {
        this._tabChanged(event.detail.item, this._previousTab);
        this._previousTab = event.detail.item;
        this.cancelDebouncer('tab-changed');
      },

      _onIronDeselect: function(event) {
        this.debounce('tab-changed', function() {
          this._tabChanged(null, this._previousTab);
          this._previousTab = null;
        // See polymer/polymer#1305
        }, 1);
      },

      _activateHandler: function() {
        // Cancel item activations scheduled by keyboard events when any other
        // action causes an item to be activated (e.g. clicks).
        this._cancelPendingActivation();

        Polymer.IronMenuBehaviorImpl._activateHandler.apply(this, arguments);
      },

      /**
       * Activates an item after a delay (in milliseconds).
       */
      _scheduleActivation: function(item, delay) {
        this._pendingActivationItem = item;
        this._pendingActivationTimeout = this.async(
            this._bindDelayedActivationHandler, delay);
      },

      /**
       * Activates the last item given to `_scheduleActivation`.
       */
      _delayedActivationHandler: function() {
        var item = this._pendingActivationItem;
        this._pendingActivationItem = undefined;
        this._pendingActivationTimeout = undefined;
        item.fire(this.activateEvent, null, {
          bubbles: true,
          cancelable: true
        });
      },

      /**
       * Cancels a previously scheduled item activation made with
       * `_scheduleActivation`.
       */
      _cancelPendingActivation: function() {
        if (this._pendingActivationTimeout !== undefined) {
          this.cancelAsync(this._pendingActivationTimeout);
          this._pendingActivationItem = undefined;
          this._pendingActivationTimeout = undefined;
        }
      },

      _onArrowKeyup: function(event) {
        if (this.autoselect) {
          this._scheduleActivation(this.focusedItem, this.autoselectDelay);
        }
      },

      _onBlurCapture: function(event) {
        // Cancel a scheduled item activation (if any) when that item is
        // blurred.
        if (event.target === this._pendingActivationItem) {
          this._cancelPendingActivation();
        }
      },

      get _tabContainerScrollSize () {
        return Math.max(
          0,
          this.$.tabsContainer.scrollWidth -
            this.$.tabsContainer.offsetWidth
        );
      },

      _scroll: function(e, detail) {
        if (!this.scrollable) {
          return;
        }

        var ddx = (detail && -detail.ddx) || 0;
        this._affectScroll(ddx);
      },

      _down: function(e) {
        // go one beat async to defeat IronMenuBehavior
        // autorefocus-on-no-selection timeout
        this.async(function() {
          if (this._defaultFocusAsync) {
            this.cancelAsync(this._defaultFocusAsync);
            this._defaultFocusAsync = null;
          }
        }, 1);
      },

      _affectScroll: function(dx) {
        this.$.tabsContainer.scrollLeft += dx;

        var scrollLeft = this.$.tabsContainer.scrollLeft;

        this._leftHidden = scrollLeft === 0;
        this._rightHidden = scrollLeft === this._tabContainerScrollSize;
      },

      _onLeftScrollButtonDown: function() {
        this._scrollToLeft();
        this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
      },

      _onRightScrollButtonDown: function() {
        this._scrollToRight();
        this._holdJob = setInterval(this._scrollToRight.bind(this), this._holdDelay);
      },

      _onScrollButtonUp: function() {
        clearInterval(this._holdJob);
        this._holdJob = null;
      },

      _scrollToLeft: function() {
        this._affectScroll(-this._step);
      },

      _scrollToRight: function() {
        this._affectScroll(this._step);
      },

      _tabChanged: function(tab, old) {
        if (!tab) {
          // Remove the bar without animation.
          this.$.selectionBar.classList.remove('expand');
          this.$.selectionBar.classList.remove('contract');
          this._positionBar(0, 0);
          return;
        }

        var r = this.$.tabsContent.getBoundingClientRect();
        var w = r.width;
        var tabRect = tab.getBoundingClientRect();
        var tabOffsetLeft = tabRect.left - r.left;

        this._pos = {
          width: this._calcPercent(tabRect.width, w),
          left: this._calcPercent(tabOffsetLeft, w)
        };

        if (this.noSlide || old == null) {
          // Position the bar without animation.
          this.$.selectionBar.classList.remove('expand');
          this.$.selectionBar.classList.remove('contract');
          this._positionBar(this._pos.width, this._pos.left);
          return;
        }

        var oldRect = old.getBoundingClientRect();
        var oldIndex = this.items.indexOf(old);
        var index = this.items.indexOf(tab);
        var m = 5;

        // bar animation: expand
        this.$.selectionBar.classList.add('expand');

        var moveRight = oldIndex < index;
        var isRTL = this._isRTL;
        if (isRTL) {
          moveRight = !moveRight;
        }

        if (moveRight) {
          this._positionBar(this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m,
              this._left);
        } else {
          this._positionBar(this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m,
              this._calcPercent(tabOffsetLeft, w) + m);
        }

        if (this.scrollable) {
          this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
        }
      },

      _scrollToSelectedIfNeeded: function(tabWidth, tabOffsetLeft) {
        var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
        if (l < 0) {
          this.$.tabsContainer.scrollLeft += l;
        } else {
          l += (tabWidth - this.$.tabsContainer.offsetWidth);
          if (l > 0) {
            this.$.tabsContainer.scrollLeft += l;
          }
        }
      },

      _calcPercent: function(w, w0) {
        return 100 * w / w0;
      },

      _positionBar: function(width, left) {
        width = width || 0;
        left = left || 0;

        this._width = width;
        this._left = left;
        this.transform(
            'translateX(' + left + '%) scaleX(' + (width / 100) + ')',
            this.$.selectionBar);
      },

      _onBarTransitionEnd: function(e) {
        var cl = this.$.selectionBar.classList;
        // bar animation: expand -> contract
        if (cl.contains('expand')) {
          cl.remove('expand');
          cl.add('contract');
          this._positionBar(this._pos.width, this._pos.left);
        // bar animation done
        } else if (cl.contains('contract')) {
          cl.remove('contract');
        }
      }
    });
/**
  Polymer.IronFormElementBehavior enables a custom element to be included
  in an `iron-form`.

  @demo demo/index.html
  @polymerBehavior
  */
  Polymer.IronFormElementBehavior = {

    properties: {
      /**
       * Fired when the element is added to an `iron-form`.
       *
       * @event iron-form-element-register
       */

      /**
       * Fired when the element is removed from an `iron-form`.
       *
       * @event iron-form-element-unregister
       */

      /**
       * The name of this element.
       */
      name: {
        type: String
      },

      /**
       * The value for this element.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to mark the input as required. If used in a form, a
       * custom element that uses this behavior should also use
       * Polymer.IronValidatableBehavior and define a custom validation method.
       * Otherwise, a `required` element will always be considered valid.
       * It's also strongly recommended to provide a visual style for the element
       * when its value is invalid.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The form that the element is registered to.
       */
      _parentForm: {
        type: Object
      }
    },

    attached: function() {
      // Note: the iron-form that this element belongs to will set this
      // element's _parentForm property when handling this event.
      this.fire('iron-form-element-register');
    },

    detached: function() {
      if (this._parentForm) {
        this._parentForm.fire('iron-form-element-unregister', {target: this});
      }
    }

  };
/**
   * Singleton IronMeta instance.
   */
  Polymer.IronValidatableBehaviorMeta = null;

  /**
   * `Use Polymer.IronValidatableBehavior` to implement an element that validates user input.
   * Use the related `Polymer.IronValidatorBehavior` to add custom validation logic to an iron-input.
   *
   * By default, an `<iron-form>` element validates its fields when the user presses the submit button.
   * To validate a form imperatively, call the form's `validate()` method, which in turn will
   * call `validate()` on all its children. By using `Polymer.IronValidatableBehavior`, your
   * custom element will get a public `validate()`, which
   * will return the validity of the element, and a corresponding `invalid` attribute,
   * which can be used for styling.
   *
   * To implement the custom validation logic of your element, you must override
   * the protected `_getValidity()` method of this behaviour, rather than `validate()`.
   * See [this](https://github.com/PolymerElements/iron-form/blob/master/demo/simple-element.html)
   * for an example.
   *
   * ### Accessibility
   *
   * Changing the `invalid` property, either manually or by calling `validate()` will update the
   * `aria-invalid` attribute.
   *
   * @demo demo/index.html
   * @polymerBehavior
   */
  Polymer.IronValidatableBehavior = {

    properties: {

      /**
       * Name of the validator to use.
       */
      validator: {
        type: String
      },

      /**
       * True if the last call to `validate` is invalid.
       */
      invalid: {
        notify: true,
        reflectToAttribute: true,
        type: Boolean,
        value: false
      },

      /**
       * This property is deprecated and should not be used. Use the global
       * validator meta singleton, `Polymer.IronValidatableBehaviorMeta` instead.
       */
      _validatorMeta: {
        type: Object
      },

      /**
       * Namespace for this validator. This property is deprecated and should
       * not be used. For all intents and purposes, please consider it a
       * read-only, config-time property.
       */
      validatorType: {
        type: String,
        value: 'validator'
      },

      _validator: {
        type: Object,
        computed: '__computeValidator(validator)'
      }
    },

    observers: [
      '_invalidChanged(invalid)'
    ],

    registered: function() {
      Polymer.IronValidatableBehaviorMeta = new Polymer.IronMeta({type: 'validator'});
    },

    _invalidChanged: function() {
      if (this.invalid) {
        this.setAttribute('aria-invalid', 'true');
      } else {
        this.removeAttribute('aria-invalid');
      }
    },

    /**
     * @return {boolean} True if the validator `validator` exists.
     */
    hasValidator: function() {
      return this._validator != null;
    },

    /**
     * Returns true if the `value` is valid, and updates `invalid`. If you want
     * your element to have custom validation logic, do not override this method;
     * override `_getValidity(value)` instead.

     * @param {Object} value The value to be validated. By default, it is passed
     * to the validator's `validate()` function, if a validator is set.
     * @return {boolean} True if `value` is valid.
     */
    validate: function(value) {
      this.invalid = !this._getValidity(value);
      return !this.invalid;
    },

    /**
     * Returns true if `value` is valid.  By default, it is passed
     * to the validator's `validate()` function, if a validator is set. You
     * should override this method if you want to implement custom validity
     * logic for your element.
     *
     * @param {Object} value The value to be validated.
     * @return {boolean} True if `value` is valid.
     */

    _getValidity: function(value) {
      if (this.hasValidator()) {
        return this._validator.validate(value);
      }
      return true;
    },

    __computeValidator: function() {
      return Polymer.IronValidatableBehaviorMeta &&
          Polymer.IronValidatableBehaviorMeta.byKey(this.validator);
    }
  };
(function() {
      'use strict';

      Polymer.IronA11yAnnouncer = Polymer({
        is: 'iron-a11y-announcer',

        properties: {

          /**
           * The value of mode is used to set the `aria-live` attribute
           * for the element that will be announced. Valid values are: `off`,
           * `polite` and `assertive`.
           */
          mode: {
            type: String,
            value: 'polite'
          },

          _text: {
            type: String,
            value: ''
          }
        },

        created: function() {
          if (!Polymer.IronA11yAnnouncer.instance) {
            Polymer.IronA11yAnnouncer.instance = this;
          }

          document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
        },

        /**
         * Cause a text string to be announced by screen readers.
         *
         * @param {string} text The text that should be announced.
         */
        announce: function(text) {
          this._text = '';
          this.async(function() {
            this._text = text;
          }, 100);
        },

        _onIronAnnounce: function(event) {
          if (event.detail && event.detail.text) {
            this.announce(event.detail.text);
          }
        }
      });

      Polymer.IronA11yAnnouncer.instance = null;

      Polymer.IronA11yAnnouncer.requestAvailability = function() {
        if (!Polymer.IronA11yAnnouncer.instance) {
          Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
        }

        document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
      };
    })();
/*
`<iron-input>` adds two-way binding and custom validators using `Polymer.IronValidatorBehavior`
to `<input>`.

### Two-way binding

By default you can only get notified of changes to an `input`'s `value` due to user input:

    <input value="{{myValue::input}}">

`iron-input` adds the `bind-value` property that mirrors the `value` property, and can be used
for two-way data binding. `bind-value` will notify if it is changed either by user input or by script.

    <input is="iron-input" bind-value="{{myValue}}">

### Custom validators

You can use custom validators that implement `Polymer.IronValidatorBehavior` with `<iron-input>`.

    <input is="iron-input" validator="my-custom-validator">

### Stopping invalid input

It may be desirable to only allow users to enter certain characters. You can use the
`prevent-invalid-input` and `allowed-pattern` attributes together to accomplish this. This feature
is separate from validation, and `allowed-pattern` does not affect how the input is validated.

    <!-- only allow characters that match [0-9] -->
    <input is="iron-input" prevent-invalid-input allowed-pattern="[0-9]">

@hero hero.svg
@demo demo/index.html
*/

  Polymer({

    is: 'iron-input',

    extends: 'input',

    behaviors: [
      Polymer.IronValidatableBehavior
    ],

    properties: {

      /**
       * Use this property instead of `value` for two-way data binding.
       */
      bindValue: {
        observer: '_bindValueChanged',
        type: String
      },

      /**
       * Set to true to prevent the user from entering invalid input. If `allowedPattern` is set,
       * any character typed by the user will be matched against that pattern, and rejected if it's not a match.
       * Pasted input will have each character checked individually; if any character
       * doesn't match `allowedPattern`, the entire pasted string will be rejected.
       * If `allowedPattern` is not set, it will use the `type` attribute (only supported for `type=number`).
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Regular expression that list the characters allowed as input.
       * This pattern represents the allowed characters for the field; as the user inputs text,
       * each individual character will be checked against the pattern (rather than checking
       * the entire value as a whole). The recommended format should be a list of allowed characters;
       * for example, `[a-zA-Z0-9.+-!;:]`
       */
      allowedPattern: {
        type: String,
        observer: "_allowedPatternChanged"
      },

      _previousValidInput: {
        type: String,
        value: ''
      },

      _patternAlreadyChecked: {
        type: Boolean,
        value: false
      }

    },

    listeners: {
      'input': '_onInput',
      'keypress': '_onKeypress'
    },

    /** @suppress {checkTypes} */
    registered: function() {
      // Feature detect whether we need to patch dispatchEvent (i.e. on FF and IE).
      if (!this._canDispatchEventOnDisabled()) {
        this._origDispatchEvent = this.dispatchEvent;
        this.dispatchEvent = this._dispatchEventFirefoxIE;
      }
    },

    created: function() {
      Polymer.IronA11yAnnouncer.requestAvailability();
    },

    _canDispatchEventOnDisabled: function() {
      var input = document.createElement('input');
      var canDispatch = false;
      input.disabled = true;

      input.addEventListener('feature-check-dispatch-event', function() {
        canDispatch = true;
      });

      try {
        input.dispatchEvent(new Event('feature-check-dispatch-event'));
      } catch(e) {}

      return canDispatch;
    },

    _dispatchEventFirefoxIE: function() {
      // Due to Firefox bug, events fired on disabled form controls can throw
      // errors; furthermore, neither IE nor Firefox will actually dispatch
      // events from disabled form controls; as such, we toggle disable around
      // the dispatch to allow notifying properties to notify
      // See issue #47 for details
      var disabled = this.disabled;
      this.disabled = false;
      this._origDispatchEvent.apply(this, arguments);
      this.disabled = disabled;
    },

    get _patternRegExp() {
      var pattern;
      if (this.allowedPattern) {
        pattern = new RegExp(this.allowedPattern);
      } else {
        switch (this.type) {
          case 'number':
            pattern = /[0-9.,e-]/;
            break;
        }
      }
      return pattern;
    },

    ready: function() {
      this.bindValue = this.value;
    },

    /**
     * @suppress {checkTypes}
     */
    _bindValueChanged: function() {
      if (this.value !== this.bindValue) {
        this.value = !(this.bindValue || this.bindValue === 0 || this.bindValue === false) ? '' : this.bindValue;
      }
      // manually notify because we don't want to notify until after setting value
      this.fire('bind-value-changed', {value: this.bindValue});
    },

    _allowedPatternChanged: function() {
      // Force to prevent invalid input when an `allowed-pattern` is set
      this.preventInvalidInput = this.allowedPattern ? true : false;
    },

    _onInput: function() {
      // Need to validate each of the characters pasted if they haven't
      // been validated inside `_onKeypress` already.
      if (this.preventInvalidInput && !this._patternAlreadyChecked) {
        var valid = this._checkPatternValidity();
        if (!valid) {
          this._announceInvalidCharacter('Invalid string of characters not entered.');
          this.value = this._previousValidInput;
        }
      }

      this.bindValue = this.value;
      this._previousValidInput = this.value;
      this._patternAlreadyChecked = false;
    },

    _isPrintable: function(event) {
      // What a control/printable character is varies wildly based on the browser.
      // - most control characters (arrows, backspace) do not send a `keypress` event
      //   in Chrome, but the *do* on Firefox
      // - in Firefox, when they do send a `keypress` event, control chars have
      //   a charCode = 0, keyCode = xx (for ex. 40 for down arrow)
      // - printable characters always send a keypress event.
      // - in Firefox, printable chars always have a keyCode = 0. In Chrome, the keyCode
      //   always matches the charCode.
      // None of this makes any sense.

      // For these keys, ASCII code == browser keycode.
      var anyNonPrintable =
        (event.keyCode == 8)   ||  // backspace
        (event.keyCode == 9)   ||  // tab
        (event.keyCode == 13)  ||  // enter
        (event.keyCode == 27);     // escape

      // For these keys, make sure it's a browser keycode and not an ASCII code.
      var mozNonPrintable =
        (event.keyCode == 19)  ||  // pause
        (event.keyCode == 20)  ||  // caps lock
        (event.keyCode == 45)  ||  // insert
        (event.keyCode == 46)  ||  // delete
        (event.keyCode == 144) ||  // num lock
        (event.keyCode == 145) ||  // scroll lock
        (event.keyCode > 32 && event.keyCode < 41)   || // page up/down, end, home, arrows
        (event.keyCode > 111 && event.keyCode < 124); // fn keys

      return !anyNonPrintable && !(event.charCode == 0 && mozNonPrintable);
    },

    _onKeypress: function(event) {
      if (!this.preventInvalidInput && this.type !== 'number') {
        return;
      }
      var regexp = this._patternRegExp;
      if (!regexp) {
        return;
      }

      // Handle special keys and backspace
      if (event.metaKey || event.ctrlKey || event.altKey)
        return;

      // Check the pattern either here or in `_onInput`, but not in both.
      this._patternAlreadyChecked = true;

      var thisChar = String.fromCharCode(event.charCode);
      if (this._isPrintable(event) && !regexp.test(thisChar)) {
        event.preventDefault();
        this._announceInvalidCharacter('Invalid character ' + thisChar + ' not entered.');
      }
    },

    _checkPatternValidity: function() {
      var regexp = this._patternRegExp;
      if (!regexp) {
        return true;
      }
      for (var i = 0; i < this.value.length; i++) {
        if (!regexp.test(this.value[i])) {
          return false;
        }
      }
      return true;
    },

    /**
     * Returns true if `value` is valid. The validator provided in `validator` will be used first,
     * then any constraints.
     * @return {boolean} True if the value is valid.
     */
    validate: function() {
      // First, check what the browser thinks. Some inputs (like type=number)
      // behave weirdly and will set the value to "" if something invalid is
      // entered, but will set the validity correctly.
      var valid =  this.checkValidity();

      // Only do extra checking if the browser thought this was valid.
      if (valid) {
        // Empty, required input is invalid
        if (this.required && this.value === '') {
          valid = false;
        } else if (this.hasValidator()) {
          valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
        }
      }

      this.invalid = !valid;
      this.fire('iron-input-validate');
      return valid;
    },

    _announceInvalidCharacter: function(message) {
      this.fire('iron-announce', { text: message });
    }
  });

  /*
  The `iron-input-validate` event is fired whenever `validate()` is called.
  @event iron-input-validate
  */
// Generate unique, monotonically increasing IDs for labels (needed by
  // aria-labelledby) and add-ons.
  Polymer.PaperInputHelper = {};
  Polymer.PaperInputHelper.NextLabelID = 1;
  Polymer.PaperInputHelper.NextAddonID = 1;

  /**
   * Use `Polymer.PaperInputBehavior` to implement inputs with `<paper-input-container>`. This
   * behavior is implemented by `<paper-input>`. It exposes a number of properties from
   * `<paper-input-container>` and `<input is="iron-input">` and they should be bound in your
   * template.
   *
   * The input element can be accessed by the `inputElement` property if you need to access
   * properties or methods that are not exposed.
   * @polymerBehavior Polymer.PaperInputBehavior
   */
  Polymer.PaperInputBehaviorImpl = {

    properties: {
      /**
       * Fired when the input changes due to user interaction.
       *
       * @event change
       */

      /**
       * The label for this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * `<label>`'s content and `hidden` property, e.g.
       * `<label hidden$="[[!label]]">[[label]]</label>` in your `template`
       */
      label: {
        type: String
      },

      /**
       * The value for this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `bindValue`
       * property, or the value property of your input that is `notify:true`.
       */
      value: {
        notify: true,
        type: String
      },

      /**
       * Set to true to disable this input. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * both the `<paper-input-container>`'s and the input's `disabled` property.
       */
      disabled: {
        type: Boolean,
        value: false
      },

      /**
       * Returns true if the value is invalid. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to both the
       * `<paper-input-container>`'s and the input's `invalid` property.
       *
       * If `autoValidate` is true, the `invalid` attribute is managed automatically,
       * which can clobber attempts to manage it manually.
       */
      invalid: {
        type: Boolean,
        value: false,
        notify: true
      },

      /**
       * Set to true to prevent the user from entering invalid input. If you're
       * using PaperInputBehavior to  implement your own paper-input-like element,
       * bind this to `<input is="iron-input">`'s `preventInvalidInput` property.
       */
      preventInvalidInput: {
        type: Boolean
      },

      /**
       * Set this to specify the pattern allowed by `preventInvalidInput`. If
       * you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `allowedPattern`
       * property.
       */
      allowedPattern: {
        type: String
      },

      /**
       * The type of the input. The supported types are `text`, `number` and `password`.
       * If you're using PaperInputBehavior to implement your own paper-input-like element,
       * bind this to the `<input is="iron-input">`'s `type` property.
       */
      type: {
        type: String
      },

      /**
       * The datalist of the input (if any). This should match the id of an existing `<datalist>`.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `list` property.
       */
      list: {
        type: String
      },

      /**
       * A pattern to validate the `input` with. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `pattern` property.
       */
      pattern: {
        type: String
      },

      /**
       * Set to true to mark the input as required. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `required` property.
       */
      required: {
        type: Boolean,
        value: false
      },

      /**
       * The error message to display when the input is invalid. If you're using
       * PaperInputBehavior to implement your own paper-input-like element,
       * bind this to the `<paper-input-error>`'s content, if using.
       */
      errorMessage: {
        type: String
      },

      /**
       * Set to true to show a character counter.
       */
      charCounter: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to disable the floating label. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `noLabelFloat` property.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the label. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `alwaysFloatLabel` property.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to auto-validate the input value. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<paper-input-container>`'s `autoValidate` property.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * Name of the validator to use. If you're using PaperInputBehavior to
       * implement your own paper-input-like element, bind this to
       * the `<input is="iron-input">`'s `validator` property.
       */
      validator: {
        type: String
      },

      // HTMLInputElement attributes for binding if needed

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocomplete` property.
       */
      autocomplete: {
        type: String,
        value: 'off'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autofocus` property.
       */
      autofocus: {
        type: Boolean,
        observer: '_autofocusChanged'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `inputmode` property.
       */
      inputmode: {
        type: String
      },

      /**
       * The minimum length of the input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `minlength` property.
       */
      minlength: {
        type: Number
      },

      /**
       * The maximum length of the input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `maxlength` property.
       */
      maxlength: {
        type: Number
      },

      /**
       * The minimum (numeric or date-time) input value.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `min` property.
       */
      min: {
        type: String
      },

      /**
       * The maximum (numeric or date-time) input value.
       * Can be a String (e.g. `"2000-01-01"`) or a Number (e.g. `2`).
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `max` property.
       */
      max: {
        type: String
      },

      /**
       * Limits the numeric or date-time increments.
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `step` property.
       */
      step: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `name` property.
       */
      name: {
        type: String
      },

      /**
       * A placeholder string in addition to the label. If this is set, the label will always float.
       */
      placeholder: {
        type: String,
        // need to set a default so _computeAlwaysFloatLabel is run
        value: ''
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `readonly` property.
       */
      readonly: {
        type: Boolean,
        value: false
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `size` property.
       */
      size: {
        type: Number
      },

      // Nonstandard attributes for binding if needed

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocapitalize` property.
       */
      autocapitalize: {
        type: String,
        value: 'none'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autocorrect` property.
       */
      autocorrect: {
        type: String,
        value: 'off'
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `autosave` property,
       * used with type=search.
       */
      autosave: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `results` property,
       * used with type=search.
       */
      results: {
        type: Number
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the `<input is="iron-input">`'s `accept` property,
       * used with type=file.
       */
      accept: {
        type: String
      },

      /**
       * If you're using PaperInputBehavior to implement your own paper-input-like
       * element, bind this to the`<input is="iron-input">`'s `multiple` property,
       * used with type=file.
       */
      multiple: {
        type: Boolean
      },

      _ariaDescribedBy: {
        type: String,
        value: ''
      },

      _ariaLabelledBy: {
        type: String,
        value: ''
      }

    },

    listeners: {
      'addon-attached': '_onAddonAttached',
    },

    keyBindings: {
      'shift+tab:keydown': '_onShiftTabDown'
    },

    hostAttributes: {
      tabindex: 0
    },

    /**
     * Returns a reference to the input element.
     */
    get inputElement() {
      return this.$.input;
    },

    /**
     * Returns a reference to the focusable element.
     */
    get _focusableElement() {
      return this.inputElement;
    },

    registered: function() {
      // These types have some default placeholder text; overlapping
      // the label on top of it looks terrible. Auto-float the label in this case.
      this._typesThatHaveText = ["date", "datetime", "datetime-local", "month",
          "time", "week", "file"];
    },

    attached: function() {
      this._updateAriaLabelledBy();

      if (this.inputElement &&
          this._typesThatHaveText.indexOf(this.inputElement.type) !== -1) {
        this.alwaysFloatLabel = true;
      }
    },

    _appendStringWithSpace: function(str, more) {
      if (str) {
        str = str + ' ' + more;
      } else {
        str = more;
      }
      return str;
    },

    _onAddonAttached: function(event) {
      var target = event.path ? event.path[0] : event.target;
      if (target.id) {
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, target.id);
      } else {
        var id = 'paper-input-add-on-' + Polymer.PaperInputHelper.NextAddonID++;
        target.id = id;
        this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, id);
      }
    },

    /**
     * Validates the input element and sets an error style if needed.
     *
     * @return {boolean}
     */
    validate: function() {
      return this.inputElement.validate();
    },

    /**
     * Forward focus to inputElement. Overriden from IronControlState.
     */
    _focusBlurHandler: function(event) {
      Polymer.IronControlState._focusBlurHandler.call(this, event);

      // Forward the focus to the nested input.
      if (this.focused && !this._shiftTabPressed)
        this._focusableElement.focus();
    },

    /**
     * Handler that is called when a shift+tab keypress is detected by the menu.
     *
     * @param {CustomEvent} event A key combination event.
     */
    _onShiftTabDown: function(event) {
      var oldTabIndex = this.getAttribute('tabindex');
      this._shiftTabPressed = true;
      this.setAttribute('tabindex', '-1');
      this.async(function() {
        this.setAttribute('tabindex', oldTabIndex);
        this._shiftTabPressed = false;
      }, 1);
    },

    /**
     * If `autoValidate` is true, then validates the element.
     */
    _handleAutoValidate: function() {
      if (this.autoValidate)
        this.validate();
    },

    /**
     * Restores the cursor to its original position after updating the value.
     * @param {string} newValue The value that should be saved.
     */
    updateValueAndPreserveCaret: function(newValue) {
      // Not all elements might have selection, and even if they have the
      // right properties, accessing them might throw an exception (like for
      // <input type=number>)
      try {
        var start = this.inputElement.selectionStart;
        this.value = newValue;

        // The cursor automatically jumps to the end after re-setting the value,
        // so restore it to its original position.
        this.inputElement.selectionStart = start;
        this.inputElement.selectionEnd = start;
      } catch (e) {
        // Just set the value and give up on the caret.
        this.value = newValue;
      }
    },

    _computeAlwaysFloatLabel: function(alwaysFloatLabel, placeholder) {
      return placeholder || alwaysFloatLabel;
    },

    _updateAriaLabelledBy: function() {
      var label = Polymer.dom(this.root).querySelector('label');
      if (!label) {
        this._ariaLabelledBy = '';
        return;
      }
      var labelledBy;
      if (label.id) {
        labelledBy = label.id;
      } else {
        labelledBy = 'paper-input-label-' + Polymer.PaperInputHelper.NextLabelID++;
        label.id = labelledBy;
      }
      this._ariaLabelledBy = labelledBy;
    },

    _onChange:function(event) {
      // In the Shadow DOM, the `change` event is not leaked into the
      // ancestor tree, so we must do this manually.
      // See https://w3c.github.io/webcomponents/spec/shadow/#events-that-are-not-leaked-into-ancestor-trees.
      if (this.shadowRoot) {
        this.fire(event.type, {sourceEvent: event}, {
          node: this,
          bubbles: event.bubbles,
          cancelable: event.cancelable
        });
      }
    },

    _autofocusChanged: function() {
      // Firefox doesn't respect the autofocus attribute if it's applied after
      // the page is loaded (Chrome/WebKit do respect it), preventing an
      // autofocus attribute specified in markup from taking effect when the
      // element is upgraded. As a workaround, if the autofocus property is set,
      // and the focus hasn't already been moved elsewhere, we take focus.
      if (this.autofocus && this._focusableElement) {

        // In IE 11, the default document.activeElement can be the page's
        // outermost html element, but there are also cases (under the
        // polyfill?) in which the activeElement is not a real HTMLElement, but
        // just a plain object. We identify the latter case as having no valid
        // activeElement.
        var activeElement = document.activeElement;
        var isActiveElementValid = activeElement instanceof HTMLElement;

        // Has some other element has already taken the focus?
        var isSomeElementActive = isActiveElementValid &&
            activeElement !== document.body &&
            activeElement !== document.documentElement; /* IE 11 */
        if (!isSomeElementActive) {
          // No specific element has taken the focus yet, so we can take it.
          this._focusableElement.focus();
        }
      }
    }
  };

  /** @polymerBehavior */
  Polymer.PaperInputBehavior = [
    Polymer.IronControlState,
    Polymer.IronA11yKeysBehavior,
    Polymer.PaperInputBehaviorImpl
  ];
/**
   * Use `Polymer.PaperInputAddonBehavior` to implement an add-on for `<paper-input-container>`. A
   * add-on appears below the input, and may display information based on the input value and
   * validity such as a character counter or an error message.
   * @polymerBehavior
   */
  Polymer.PaperInputAddonBehavior = {

    hostAttributes: {
      'add-on': ''
    },

    attached: function() {
      this.fire('addon-attached');
    },

    /**
     * The function called by `<paper-input-container>` when the input value or validity changes.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
    }

  };
Polymer({
    is: 'paper-input-char-counter',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      _charCounterStr: {
        type: String,
        value: '0'
      }
    },

    /**
     * This overrides the update function in PaperInputAddonBehavior.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
      if (!state.inputElement) {
        return;
      }

      state.value = state.value || '';

      var counter = state.value.toString().length.toString();

      if (state.inputElement.hasAttribute('maxlength')) {
        counter += '/' + state.inputElement.getAttribute('maxlength');
      }

      this._charCounterStr = counter;
    }
  });
Polymer({
    is: 'paper-input-container',

    properties: {
      /**
       * Set to true to disable the floating label. The label disappears when the input value is
       * not null.
       */
      noLabelFloat: {
        type: Boolean,
        value: false
      },

      /**
       * Set to true to always float the floating label.
       */
      alwaysFloatLabel: {
        type: Boolean,
        value: false
      },

      /**
       * The attribute to listen for value changes on.
       */
      attrForValue: {
        type: String,
        value: 'bind-value'
      },

      /**
       * Set to true to auto-validate the input value when it changes.
       */
      autoValidate: {
        type: Boolean,
        value: false
      },

      /**
       * True if the input is invalid. This property is set automatically when the input value
       * changes if auto-validating, or when the `iron-input-validate` event is heard from a child.
       */
      invalid: {
        observer: '_invalidChanged',
        type: Boolean,
        value: false
      },

      /**
       * True if the input has focus.
       */
      focused: {
        readOnly: true,
        type: Boolean,
        value: false,
        notify: true
      },

      _addons: {
        type: Array
        // do not set a default value here intentionally - it will be initialized lazily when a
        // distributed child is attached, which may occur before configuration for this element
        // in polyfill.
      },

      _inputHasContent: {
        type: Boolean,
        value: false
      },

      _inputSelector: {
        type: String,
        value: 'input,textarea,.paper-input-input'
      },

      _boundOnFocus: {
        type: Function,
        value: function() {
          return this._onFocus.bind(this);
        }
      },

      _boundOnBlur: {
        type: Function,
        value: function() {
          return this._onBlur.bind(this);
        }
      },

      _boundOnInput: {
        type: Function,
        value: function() {
          return this._onInput.bind(this);
        }
      },

      _boundValueChanged: {
        type: Function,
        value: function() {
          return this._onValueChanged.bind(this);
        }
      }
    },

    listeners: {
      'addon-attached': '_onAddonAttached',
      'iron-input-validate': '_onIronInputValidate'
    },

    get _valueChangedEvent() {
      return this.attrForValue + '-changed';
    },

    get _propertyForValue() {
      return Polymer.CaseMap.dashToCamelCase(this.attrForValue);
    },

    get _inputElement() {
      return Polymer.dom(this).querySelector(this._inputSelector);
    },

    get _inputElementValue() {
      return this._inputElement[this._propertyForValue] || this._inputElement.value;
    },

    ready: function() {
      if (!this._addons) {
        this._addons = [];
      }
      this.addEventListener('focus', this._boundOnFocus, true);
      this.addEventListener('blur', this._boundOnBlur, true);
    },

    attached: function() {
      if (this.attrForValue) {
        this._inputElement.addEventListener(this._valueChangedEvent, this._boundValueChanged);
      } else {
        this.addEventListener('input', this._onInput);
      }

      // Only validate when attached if the input already has a value.
      if (this._inputElementValue != '') {
        this._handleValueAndAutoValidate(this._inputElement);
      } else {
        this._handleValue(this._inputElement);
      }
    },

    _onAddonAttached: function(event) {
      if (!this._addons) {
        this._addons = [];
      }
      var target = event.target;
      if (this._addons.indexOf(target) === -1) {
        this._addons.push(target);
        if (this.isAttached) {
          this._handleValue(this._inputElement);
        }
      }
    },

    _onFocus: function() {
      this._setFocused(true);
    },

    _onBlur: function() {
      this._setFocused(false);
      this._handleValueAndAutoValidate(this._inputElement);
    },

    _onInput: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _onValueChanged: function(event) {
      this._handleValueAndAutoValidate(event.target);
    },

    _handleValue: function(inputElement) {
      var value = this._inputElementValue;

      // type="number" hack needed because this.value is empty until it's valid
      if (value || value === 0 || (inputElement.type === 'number' && !inputElement.checkValidity())) {
        this._inputHasContent = true;
      } else {
        this._inputHasContent = false;
      }

      this.updateAddons({
        inputElement: inputElement,
        value: value,
        invalid: this.invalid
      });
    },

    _handleValueAndAutoValidate: function(inputElement) {
      if (this.autoValidate) {
        var valid;
        if (inputElement.validate) {
          valid = inputElement.validate(this._inputElementValue);
        } else {
          valid = inputElement.checkValidity();
        }
        this.invalid = !valid;
      }

      // Call this last to notify the add-ons.
      this._handleValue(inputElement);
    },

    _onIronInputValidate: function(event) {
      this.invalid = this._inputElement.invalid;
    },

    _invalidChanged: function() {
      if (this._addons) {
        this.updateAddons({invalid: this.invalid});
      }
    },

    /**
     * Call this to update the state of add-ons.
     * @param {Object} state Add-on state.
     */
    updateAddons: function(state) {
      for (var addon, index = 0; addon = this._addons[index]; index++) {
        addon.update(state);
      }
    },

    _computeInputContentClass: function(noLabelFloat, alwaysFloatLabel, focused, invalid, _inputHasContent) {
      var cls = 'input-content';
      if (!noLabelFloat) {
        var label = this.querySelector('label');

        if (alwaysFloatLabel || _inputHasContent) {
          cls += ' label-is-floating';
          // If the label is floating, ignore any offsets that may have been
          // applied from a prefix element.
          this.$.labelAndInputContainer.style.position = 'static';

          if (invalid) {
            cls += ' is-invalid';
          } else if (focused) {
            cls += " label-is-highlighted";
          }
        } else {
          // When the label is not floating, it should overlap the input element.
          if (label) {
            this.$.labelAndInputContainer.style.position = 'relative';
          }
        }
      } else {
        if (_inputHasContent) {
          cls += ' label-is-hidden';
        }
      }
      return cls;
    },

    _computeUnderlineClass: function(focused, invalid) {
      var cls = 'underline';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    },

    _computeAddOnContentClass: function(focused, invalid) {
      var cls = 'add-on-content';
      if (invalid) {
        cls += ' is-invalid';
      } else if (focused) {
        cls += ' is-highlighted'
      }
      return cls;
    }
  });
Polymer({
    is: 'paper-input-error',

    behaviors: [
      Polymer.PaperInputAddonBehavior
    ],

    properties: {
      /**
       * True if the error is showing.
       */
      invalid: {
        readOnly: true,
        reflectToAttribute: true,
        type: Boolean
      }
    },

    /**
     * This overrides the update function in PaperInputAddonBehavior.
     * @param {{
     *   inputElement: (Element|undefined),
     *   value: (string|undefined),
     *   invalid: boolean
     * }} state -
     *     inputElement: The input element.
     *     value: The input value.
     *     invalid: True if the input value is invalid.
     */
    update: function(state) {
      this._setInvalid(state.invalid);
    }
  });
Polymer({
    is: 'paper-input',

    behaviors: [
      Polymer.IronFormElementBehavior,
      Polymer.PaperInputBehavior
    ]
  });
(function() {
      'use strict';

      Polymer({
        is: 'paper-dropdown-menu',

        behaviors: [
          Polymer.IronButtonState,
          Polymer.IronControlState,
          Polymer.IronFormElementBehavior,
          Polymer.IronValidatableBehavior
        ],

        properties: {
          /**
           * The derived "label" of the currently selected item. This value
           * is the `label` property on the selected item if set, or else the
           * trimmed text content of the selected item.
           */
          selectedItemLabel: {
            type: String,
            notify: true,
            readOnly: true
          },

          /**
           * The last selected item. An item is selected if the dropdown menu has
           * a child with class `dropdown-content`, and that child triggers an
           * `iron-select` event with the selected `item` in the `detail`.
           *
           * @type {?Object}
           */
          selectedItem: {
            type: Object,
            notify: true,
            readOnly: true
          },

          /**
           * The value for this element that will be used when submitting in
           * a form. It is read only, and will always have the same value
           * as `selectedItemLabel`.
           */
          value: {
            type: String,
            notify: true,
            readOnly: true
          },

          /**
           * The label for the dropdown.
           */
          label: {
            type: String
          },

          /**
           * The placeholder for the dropdown.
           */
          placeholder: {
            type: String
          },

          /**
           * The error message to display when invalid.
           */
          errorMessage: {
              type: String
          },

          /**
           * True if the dropdown is open. Otherwise, false.
           */
          opened: {
            type: Boolean,
            notify: true,
            value: false,
            observer: '_openedChanged'
          },

          /**
           * By default, the dropdown will constrain scrolling on the page
           * to itself when opened.
           * Set to true in order to prevent scroll from being constrained
           * to the dropdown when it opens.
           */
          allowOutsideScroll: {
            type: Boolean,
            value: false
          },

          /**
           * Set to true to disable the floating label. Bind this to the
           * `<paper-input-container>`'s `noLabelFloat` property.
           */
          noLabelFloat: {
              type: Boolean,
              value: false,
              reflectToAttribute: true
          },

          /**
           * Set to true to always float the label. Bind this to the
           * `<paper-input-container>`'s `alwaysFloatLabel` property.
           */
          alwaysFloatLabel: {
            type: Boolean,
            value: false
          },

          /**
           * Set to true to disable animations when opening and closing the
           * dropdown.
           */
          noAnimations: {
            type: Boolean,
            value: false
          },

          /**
           * The orientation against which to align the menu dropdown
           * horizontally relative to the dropdown trigger.
           */
          horizontalAlign: {
            type: String,
            value: 'right'
          },

          /**
           * The orientation against which to align the menu dropdown
           * vertically relative to the dropdown trigger.
           */
          verticalAlign: {
            type: String,
            value: 'top'
          },

          /**
           * If true, the `horizontalAlign` and `verticalAlign` properties will
           * be considered preferences instead of strict requirements when
           * positioning the dropdown and may be changed if doing so reduces
           * the area of the dropdown falling outside of `fitInto`.
           */
          dynamicAlign: {
            type: Boolean
          },
            
          /**
           * Whether focus should be restored to the dropdown when the menu closes.
           */
          restoreFocusOnClose: {
            type: Boolean,
            value: true
          },
        },

        listeners: {
          'tap': '_onTap'
        },

        keyBindings: {
          'up down': 'open',
          'esc': 'close'
        },

        hostAttributes: {
          role: 'combobox',
          'aria-autocomplete': 'none',
          'aria-haspopup': 'true'
        },

        observers: [
          '_selectedItemChanged(selectedItem)'
        ],

        attached: function() {
          // NOTE(cdata): Due to timing, a preselected value in a `IronSelectable`
          // child will cause an `iron-select` event to fire while the element is
          // still in a `DocumentFragment`. This has the effect of causing
          // handlers not to fire. So, we double check this value on attached:
          var contentElement = this.contentElement;
          if (contentElement && contentElement.selectedItem) {
            this._setSelectedItem(contentElement.selectedItem);
          }
        },

        /**
         * The content element that is contained by the dropdown menu, if any.
         */
        get contentElement() {
          return Polymer.dom(this.$.content).getDistributedNodes()[0];
        },

        /**
         * Show the dropdown content.
         */
        open: function() {
          this.$.menuButton.open();
        },

        /**
         * Hide the dropdown content.
         */
        close: function() {
          this.$.menuButton.close();
        },

        /**
         * A handler that is called when `iron-select` is fired.
         *
         * @param {CustomEvent} event An `iron-select` event.
         */
        _onIronSelect: function(event) {
          this._setSelectedItem(event.detail.item);
        },

        /**
         * A handler that is called when `iron-deselect` is fired.
         *
         * @param {CustomEvent} event An `iron-deselect` event.
         */
        _onIronDeselect: function(event) {
          this._setSelectedItem(null);
        },

        /**
         * A handler that is called when the dropdown is tapped.
         *
         * @param {CustomEvent} event A tap event.
         */
        _onTap: function(event) {
          if (Polymer.Gestures.findOriginalTarget(event) === this) {
            this.open();
          }
        },

        /**
         * Compute the label for the dropdown given a selected item.
         *
         * @param {Element} selectedItem A selected Element item, with an
         * optional `label` property.
         */
        _selectedItemChanged: function(selectedItem) {
          var value = '';
          if (!selectedItem) {
            value = '';
          } else {
            value = selectedItem.label || selectedItem.getAttribute('label') || selectedItem.textContent.trim();
          }

          this._setValue(value);
          this._setSelectedItemLabel(value);
        },

        /**
         * Compute the vertical offset of the menu based on the value of
         * `noLabelFloat`.
         *
         * @param {boolean} noLabelFloat True if the label should not float
         * above the input, otherwise false.
         */
        _computeMenuVerticalOffset: function(noLabelFloat) {
          // NOTE(cdata): These numbers are somewhat magical because they are
          // derived from the metrics of elements internal to `paper-input`'s
          // template. The metrics will change depending on whether or not the
          // input has a floating label.
          return noLabelFloat ? -4 : 8;
        },

        /**
         * Returns false if the element is required and does not have a selection,
         * and true otherwise.
         * @param {*=} _value Ignored.
         * @return {boolean} true if `required` is false, or if `required` is true
         * and the element has a valid selection.
         */
        _getValidity: function(_value) {
          return this.disabled || !this.required || (this.required && !!this.value);
        },

        _openedChanged: function() {
          var openState = this.opened ? 'true' : 'false';
          var e = this.contentElement;
          if (e) {
            e.setAttribute('aria-expanded', openState);
          }
        }
      });
    })();
(function() {
      Polymer({
        is: 'paper-listbox',

        behaviors: [
          Polymer.IronMenuBehavior
        ],

        hostAttributes: {
          role: 'listbox'
        }
      });
    })();
Polymer({
      is: 'structure-display',
      extends: 'pre',
      properties: {
        // A content to parse, highlight and display.
        display: String,
        // Data type to pass to the highlight function. js, xml etc.
        dataType: {
          type: String,
          value: 'js'
        },
        // If set automatically hides the element if the `display` is empty
        autoHide: {
          type: Boolean,
          value: false
        },
        // Set to true when the element has been initialized.
        _ready: Boolean
      },

      observers: [
        '_highlightSchema(display)',
        '_autoHideChanged(autoHide, display)'
      ],

      ready: function() {
        this.classList.add('markdown-html');
        this._ready = true;
        // This callbacks are be called before the element ready event is fired.
        // So they must be called again.
        this._highlightSchema(this.display);
      },

      _autoHideChanged: function(state, display) {
        if (state) {
          if (!display) {
            if (!this.hasAttribute('hidden')) {
              this.setAttribute('hidden', true);
            }
          } else {
            if (this.hasAttribute('hidden')) {
              this.removeAttribute('hidden');
            }
          }
        } else {
          if (this.hasAttribute('hidden')) {
            this.removeAttribute('hidden');
          }
        }
      },

      _highlightSchema: function(str) {
        if (!this._ready) {
          return;
        }
        if (!str) {
          this.$.output.innerHTML = '';
          return;
        }
        this.debounce('structure-display-highlight', function() {
          this.$.output.innerHTML = this.highlight(str, this.dataType);
        }, 10);
      },

      highlight: function(code, lang) {
        return this.fire('syntax-highlight', {code: code, lang: lang}).detail.code;
      },
    });
Polymer({
    is: 'docs-json-parameters-table',

    behaviors: [RamlBehaviors.DocsParametersBehavior],

    properties: {
      /**
       * A RAML's type definition for the body payload.
       */
      type: Object,
      // True when `type` is present
      hasType: {
        type: Boolean,
        computed: '_computeHasType(type.*)',
        value: false,
        notify: true,
        reflectToAttribute: true
      },
      // // Display name of the property.
      // displayName: {
      //   type: String,
      //   computed: '_computeDisplayName(type.*)'
      // },
      // JSON created from the type definition
      displayJson: {
        type: String,
        computed: '_computeDisplayJson(type.*)'
      },
      /**
       * A list of examples in the definition.
       * This is a computed value for both `example` and `examples` properties.
       */
      examples: {
        type: Array,
        computed: '_computeExamples(type.*)'
      },
      // Selected page in the tabs (where examples exists for this page)
      selectedSchemaPage: {
        type: Number,
        value: 0
      },
      // Will be set to true
      isSchema: Boolean
    },

    observers: [
      '_computeHTML(hasType, type.*)',
      '_updateTabs(hasExamples)'
    ],

    listeners: {
      'content.iron-select': '_typeDropdownChanged',
      'content.iron-deselect': '_typeDropdownChanged',
    },

    _computeHasType: function(record) {
      if (!record.base) {
        this.isSchema = false;
        return false;
      }
      var object = record.base;
      if (object.schema) {
        this.isSchema = true;
        return !!object.schemaContent;
      }
      this.isSchema = false;
      if (object.type === 'array') {
        return !!object.items;
      } else if (object.type === 'union') {
        return !!(object.anyOf && object.anyOf.length);
      } else if (object.type === 'json') {
        this.isSchema = true;
        return !!(object.content);
      }
      return !!(object.properties && Object.keys(object.properties).length);
    },

    // _computeDisplayName: function() {
    //   var type = this.type;
    //   if (!type) {
    //     return;
    //   }
    //   return type.displayName || type.key || type.type;
    // },

    _computeDisplayJson: function(record) {
      if (!record || !record.base) {
        return;
      }

      if (record.base.schema) {
        return record.base.schemaContent;
      }
      if (record.base.type instanceof Array) {
        record.base.type = record.base.type[0];
      }
      if (record.base.type === 'json') {
        return record.base.content;
      }

      var properties = record.base.properties;
      var isArray = false;
      var hasProperties = !!(properties && Object.keys(properties).length);
      if (!hasProperties) {
        if (record.base.type === 'array') {
          properties = record.base.items.properties;
          isArray = true;
          hasProperties = !!(properties && Object.keys(properties).length);
        } else if (record.base.type === 'union') {
          // just pass to the next block.
        } else {
          return undefined;
        }
      }
      var data = hasProperties ? this.__transformObject({}, properties) : {};
      var self = this;
      if (record.base.type === 'union') {
        var ut = [];
        record.base.anyOf.forEach(function(item) {
          var _props = self.__transformObject({}, item.properties, true);
          ut[ut.length] = _props;
        });
        data = Object.assign(data, ut[0]);
      }
      if (isArray) {
        data = [data];
      }
      return JSON.stringify(data, null, 2);
    },

    _computeHasExample: function() {
      // example can be an array
      var t = this.type;
      if (!t) {
        return false;
      }
      if (!t.examples && t.example) {
        t.examples = [t.example];
      }
      return !!(t.structuredExample || (t.examples && t.examples.length));
    },

    __transformObject: function(base, obj) {
      var bt = this.baseTypes;

      for (var i = 0, len = obj.length; i < len; i++) {
        var item = obj[i];
        let type = item.type;
        var structure;

        if (type instanceof Array) {
          type = type[0];
          obj.type = type;
        }
        if (bt.indexOf(type) === -1) {
          // other type defined in RAML
          if (item.properties) {
            structure = this.__transformObject({}, this.readProperties(item.properties));
          } else {
            structure = type;
          }
        } else if (type === 'object' && item.properties) {
          structure = this.__transformObject({}, this.readProperties(item.properties));
        } else if (type === 'array') {
          if (item.items.type instanceof Array) {
            item.items.type = item.items.type[0];
          }
          if (item.items.type === 'object') {
            structure = [this.__transformObject({},
              this.readProperties(item.items.properties))];
          } else {
            structure = [item.items.type];
          }
        } else {
          structure = type; //item.example || type;
        }

        base[item.key] = structure;
      }
      return base;
    },
    /**
     * Returns object's properties or, in case of array type, item item's properties.
     * Note that this function return `undefined` if properties array is empty.
     *
     * @param {Object} item Object to check for the properties.
     * @return {Array|undefined} Array of properties or undefined if there's no properties.
     */
    _getSubproperties: function(item) {
      if (!item) {
        return;
      }
      if (item.type === 'array') {
        return item.items.properties;
      }
      if (item.type === 'union') {
        return item.properties.concat(item.anyOf);
      }
      return item.properties;
    },

    _computeHTML: function(hasType) {
      if (!hasType || !this.type) {
        this.$.tableContent.innerHTML = '';
        return;
      }

      this.debounce('body-params-table-render', function() {
        this.$.tableContent.innerHTML = '';
        this.__computeHtml(this.type);
      }.bind(this), 100);
    },

    __computeUnionTypes: function(object) {
      var names = {};
      if (object.anyOf && object.anyOf.length) {
        for (var i = 0, len = object.anyOf.length; i < len; i++) {
          for (var j = 0, pLen = object.anyOf[i].properties.length; j < pLen; j++) {
            if (!(object.anyOf[i].properties[j].name in names)) {
              names[object.anyOf[i].properties[j].name] = true;
            }
          }
        }
      }
      return Object.keys(names);
    },
    /**
     * Compyte HTML value for the table.
     * It can't be done using templates because of the nested structure of the properties.
     *
     * @param {Array} props Object properties from which to create each row of the table
     * @param {DocumentFragment?} f Document fragmet to which append elements
     * @param {Object?} parent Parent for current properties. Note that it may not be actual
     * parent object for the properties. For example, in case of union types it will be
     * parent that holds union and not the atual parent object for the properties.
     * @param {Object?} immidietParent Set when `parent` is not immidiet parent of the properties.
     */
    __computeHtml: function(object, opts) {
      if (!object) {
        return;
      }
      opts = opts || {};
      var tr;
      var i;
      var len;
      var property;
      var options;
      if (this.baseTypes.indexOf(object.type) !== -1 &&
        object.type !== 'object' &&
        object.type !== 'array') {
        tr = this.__createRowForItem(object, opts);
        this.$.tableContent.appendChild(tr);
        return;
      }
      if (object.properties && object.properties.length) {
        for (i = 0, len = object.properties.length; i < len; i++) {
          property = object.properties[i];
          this.__handleHtmlDocProperty(property, opts);
        }
      }

      if (object.items && object.items.properties && object.items.properties.length) {
        tr = this.__createRowForItem(object, opts);
        this.$.tableContent.appendChild(tr);
        options = Object.assign({}, opts, {
          parent: object
        });
        for (i = 0, len = object.items.properties.length; i < len; i++) {
          property = object.items.properties[i];
          this.__handleHtmlDocProperty(property, options);
        }
      }
      if (object.type === 'union') {
        if (!object.anyOf.length) {
          return;
        }
        tr = this.__createRowForUnion(object.anyOf.length);
        this.$.tableContent.appendChild(tr);
        for (i = 0, len = object.anyOf.length; i < len; i++) {
          for (var j = 0, pLen = object.anyOf[i].properties.length; j < pLen; j++) {
            property = object.anyOf[i].properties[j];
            options = {
              inUnion: true,
              parent: opts.parent || object,
              variantIndex: i,
              childIndex: j
            };
            this.__handleHtmlDocProperty(property, options);
          }
        }
      }
    },

    __handleHtmlDocProperty: function(property, opts) {
      opts = opts || {};
      var hasChildren = false;
      if (property.properties || property.items) {
        hasChildren = true;
      }
      var options;
      var tr = this.__createRowForItem(property, opts);
      this.$.tableContent.appendChild(tr);
      if (hasChildren) {
        var children = property.properties || property.items.properties || property.items;
        if (children instanceof Array) {
          for (var j = 0, cLen = children.length; j < cLen; j++) {
            options = Object.assign({}, opts, {
              parent: property,
              hasChildren: hasChildren
            });
            this.__computeHtml(children[j], options);
          }
        } else if (typeof children === 'string') {
          //
        } else {
          if (children.type === 'any' && !children.enum) {
            return;
          }
          if (children.name !== (property.name || property.key)) {
            options = Object.assign({}, opts, {
              parent: property,
              hasChildren: hasChildren
            });
            this.__computeHtml(children, options);
          }
        }
      }
    },

    __createRowForItem: function(item, opts) {
      opts = opts || {};
      if (typeof item === 'string') {
        return;
      }
      var ce = function(el) {
        return document.createElement(el);
      };
      var tr = ce('tr');
      var td1 = ce('td');
      var td2 = ce('td');
      var td3 = ce('td');
      var sp1 = ce('span');

      var clsPrefix = 'style-scope docs-json-parameters-table';
      tr.className = clsPrefix;
      td1.className = clsPrefix + ' param-name';
      td2.className = clsPrefix + ' param-type';
      td3.className = clsPrefix + ' param-desc';
      sp1.className = clsPrefix + ' display';

      var fillParentInfo = true;
      if (opts.inUnion) {
        tr.dataset.parent = opts.variantIndex;
        tr.setAttribute('hidden', true);
        if (opts.parent.anyOf) { //[opts.variantIndex].properties[opts.childIndex] === item
          sp1.textContent = item.key;
          fillParentInfo = false;
        }
      }

      if (opts.parent) {
        if (fillParentInfo) {
          td1.className += ' subproperty';
          sp1.className += ' child';
          var spParent = ce('span');
          var spChild = ce('span');
          spParent.className = clsPrefix + ' parent-prefix';
          spParent.textContent = opts.parent.displayName || opts.parent.name || opts.parent.key;
          spChild.textContent = item.key || item.name || item.displayName;
          sp1.appendChild(spParent);
          sp1.appendChild(spChild);
          tr.className += ' subproperty';
        }
      } else {
        sp1.textContent = item.key;
      }

      if (opts.hasChildren) {
        tr.className += ' has-children';
      }

      if (item.type === 'array') {
        var name = '';
        if (!item.items.properties || !item.items.displayName) {
          name += 'Array[' + item.items.type + ']';
        } else {
          name += item.items.displayName + '[' + item.items.type + ']';
        }
        td2.textContent = name;
      } else if (item.type === 'any' && item.enum) {
        td2.textContent = 'Enum';
      } else {
        td2.textContent = item.type === 'object' ?
          (item.displayName || item.type) : item.type;
      }

      if (item.description) {
        var marked = ce('marked-element');
        var htmlBody = ce('div');
        marked.className = clsPrefix + '';
        marked.setAttribute('smartypants', true);
        marked.addEventListener('marked-render-complete', this._markedRendered.bind(this));
        htmlBody.className = clsPrefix + ' markdown-html markdown-body';
        marked.appendChild(htmlBody);
        td3.appendChild(marked);
        marked.markdown = item.description;
      }
      if (item.pattern) {
        var pattern = this.__createCellProperty('pattern', 'Validation pattern:', item.pattern);
        td3.appendChild(pattern);
      }
      if (item.example) {
        var example = this.__createCellProperty('example', 'Example:', item.example);
        td3.appendChild(example);
      }
      if (item.min || item.min === 0) {
        var min = this.__createCellProperty('min', 'Minimum value:', item.min);
        td3.appendChild(min);
      }
      if (item.max || item.max === 0) {
        var max = this.__createCellProperty('max', 'Maximum value:', item.max);
        td3.appendChild(max);
      }

      if (item.enum && item.enum.length) {
        var enumValue = this.__createCellProperty('enum', 'Possible values:',
          this._computeEnumValue(item.enum));
        td3.appendChild(enumValue);
      }

      td1.appendChild(sp1);
      if (item.required) {
        var sp2 = ce('span');
        sp2.textContent = '*';
        sp2.title = sp1.title = 'Required property';
        td1.appendChild(sp2);
      }

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      return tr;
    },

    __createRowForUnion: function(no) {
      if (!no) {
        return console.warn('Trying to invoke row for union but number is not set');
      }
      var ce = function(el) {
        return document.createElement(el);
      };
      var tr = ce('tr');
      var td1 = ce('td');
      var td2 = ce('td');
      var td3 = ce('td');
      var sp1 = ce('span');

      var cPrx = 'style-scope docs-json-parameters-table';
      tr.className = cPrx;
      td1.className = cPrx + ' param-name';
      td2.className = cPrx + ' param-type';
      td3.className = cPrx + ' param-desc';
      sp1.className = cPrx + ' display';

      sp1.textContent = 'Type variant';

      var html = '<paper-dropdown-menu no-label-float class="' + cPrx + '">';
      html += '<paper-listbox class="' + cPrx +
        ' dropdown-content" selected="0" data-action="toggle-type">';
      for (var i = 0; i < no; i++) {
        html += '<paper-item data-type="' + i + '" class="' +
          cPrx + '">Variant ' + (i + 1) + '</paper-item>';
      }
      td2.innerHTML = html;
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      return tr;
    },

    __createCellProperty: function(name, label, value) {
      var container = document.createElement('div');
      container.className = 'style-scope docs-json-parameters-table ' + name;
      var display = document.createElement('span');
      var valueNode = document.createElement('span');
      display.className = 'style-scope docs-json-parameters-table display';
      valueNode.className = 'style-scope docs-json-parameters-table value';
      display.textContent = label;
      valueNode.textContent = value;
      container.appendChild(display);
      container.appendChild(valueNode);
      return container;
    },

    _typeDropdownChanged: function(e) {
      var target = e.target;
      if (!target || !target.dataset || !target.dataset.action) {
        return;
      }
      switch (target.dataset.action) {
        case 'toggle-type':
          this._toggleType(e.detail.item.dataset.type, e.type === 'iron-select');
          break;
      }
    },

    _toggleType: function(type, visible) {
      if (!type) {
        return;
      }
      Polymer.dom(this.$.tableContent).querySelectorAll('[data-parent="' + type + '"]')
        .forEach(function(node) {
          if (visible) {
            node.removeAttribute('hidden');
          } else {
            node.setAttribute('hidden', true);
          }
        });
    },

    _markedRendered: function(e) {
      e = Polymer.dom(e);
      var target = e.rootTarget;
      var p = target.querySelector('p');
      if (!p) {
        return;
      }
      p.className += ' docs-json-parameters-table';
      var div = target.querySelector('#content');
      if (!div) {
        return;
      }
      div.className += ' markdown-html markdown-body docs-json-parameters-table';
    },
    // Forces tabs redraw when tabs are rendered
    _updateTabs: function(hasExamples) {
      if (!hasExamples) {
        return;
      }
      var elm = this.$$('paper-tabs');
      if (!elm) {
        return;
      }
      elm.notifyResize();
    },
    // Computes tab name, `Type` if not schema and `Schema` otherise.
    _getTypeTabName: function(isSchema) {
      return isSchema ? 'Schema' : 'Type';
    }

  });
Polymer({
    is: 'docs-xml-parameters-table',

    behaviors: [RamlBehaviors.DocsParametersBehavior],

    properties: {
      /**
       * A RAML's type definition for the body payload.
       */
      type: Object,
      // A schema to display. Computed value from provided `type` object.
      schemaDisplay: {
        type: String,
        computed: '_computeDisplay(type.*)'
      },
      // True when `type` is present
      hasType: {
        type: Boolean,
        computed: '_computeHasType(schemaDisplay)',
        value: false,
        notify: true,
        reflectToAttribute: true
      },
      /**
       * A list of examples in the definition.
       * This is a computed value for both `example` and `examples` properties.
       */
      examples: {
        type: Array,
        computed: '_computeExamples(type.*)'
      },
      // Selected page in the tabs (where examples exists for this page)
      selectedSchemaPage: {
        type: Number,
        value: 0
      }
    },
    // Computed boolean value if the `type` object has XML relevant information.
    _computeHasType: function(display) {
      return !!display;
    },
    // Computes the schema content to display.
    _computeDisplay: function(record) {
      var object = record.base;
      if (!object) {
        return undefined;
      }
      if (object.schema && object.schemaContent) {
        return object.schemaContent;
      }
      if (object.type && typeof object.type === 'string') {
        return object.type;
      }
      return undefined;
    }
  });
Polymer({
    is: 'docs-form-parameters-table',

    behaviors: [RamlBehaviors.DocsParametersBehavior],

    properties: {
      /**
       * A RAML's type definition for the body payload.
       */
      type: Object,
      // True when `type` is present
      hasParams: {
        type: Boolean,
        computed: '_computeHasParams(type.*)',
        value: false,
        notify: true,
        reflectToAttribute: true
      }
    },

    observers: [

    ],

    _computeHasParams: function(record) {
      if (!record.base) {
        return false;
      }
      var object = record.base;
      return !!(object.formParameters && Object.keys(object.formParameters).length);
    }
  });
Polymer({
    is: 'docs-body-parameters-table',

    behaviors: [RamlBehaviors.DocsParametersBehavior],

    properties: {
      /**
       * An array of the `body` part of the method part of the RAML definition.
       * It is expecting to be an output of the RAML to JS and ransformed with
       * the `raml2obj` library. This is available in `<raml-js-parser>`
       * element.
       */
      body: Array,
      // Display name of the property.
      displayName: {
        type: String,
        computed: '_computeDisplayName(selectedBodyType, ' +
          'displayBodySelector, selectedBody.*)'
      },
      // Computed value, true if current type is a JSON type object
      isJson: {
        type: Object,
        value: false,
        readOnly: true
      },
      // Computed value, true if current type is an XML type object
      isXml: {
        type: Object,
        value: false,
        readOnly: true
      },
      isFormUrlEncoded: {
        type: Object,
        value: false,
        readOnly: true
      },
      hasTypeJson: {
        type: Boolean,
        vealue: false
      },
      hasTypeXml: {
        type: Boolean,
        vealue: false
      },
      hasForm: {
        type: Boolean,
        vealue: false
      },
      // True if body is set.
      hasBody: {
        value: false,
        type: Boolean,
        computed: '_computeHasBody(body)',
        notify: true
      },
      // Computed list of names of the body content types.
      bodyTypes: {
        type: Array,
        readOnly: true,
        value: function() {
          return [];
        }
      },
      /**
       * Computed value, true if the body selector can be shown.
       * Body selector can be shown if there is more than one body defined
       * (many media types).
       */
      displayBodySelector: {
        type: Boolean,
        computed: '_computeDisplayBodySelector(bodyTypes.*)'
      },
      // A name of the selected body type. E.g. "application/json".
      selectedBodyType: {
        type: String,
        notify: true
      },
      // Definition of the body for `selectedBodyType`
      selectedBody: {
        type: Object,
        computed: '_computeSelectedBody(selectedBodyType)'
      }
    },

    observers: [
      '_computeBodyTypes(body.*)',
      '_autoHide(autoHide, hasBody)',
      '_computeContentType(selectedBody.*)',
      '_bodyTypesChanged(bodyTypes.*)'
    ],

    reset: function() {
      this._setBodyTypes([]);
      this.selectedBodyType = '';
      this._setIsJson(false);
      this._setIsXml(false);
    },

    _autoHide: function(autoHide, hasBody) {
      if (!autoHide) {
        return;
      }
      if (hasBody) {
        this.removeAttribute('hidden');
      } else {
        this.setAttribute('hidden', true);
      }
    },

    _computeDisplayName: function(selectedBodyType, displayBodySelector) {
      var body = this.selectedBody;
      if (!body || !selectedBodyType) {
        return '';
      }
      var type = body.displayName || body.name || body.type;
      if (type === selectedBodyType && displayBodySelector) {
        return '';
      }
      return type;
    },

    _computeContentType: function(record) {
      var type = record.base;
      var isXml = false;
      var isJson = false;
      var isFormUrlEncoded = false;
      if (!type) {
        this._setIsJson(isJson);
        this._setIsXml(isXml);
        this._setIsFormUrlEncoded(isFormUrlEncoded);
        return;
      }
      var mime;
      if (type.contentType) {
        mime = type.contentType;
      } else {
        mime = type.key;
      }
      if (!mime) {
        mime = 'application/json';
      }

      if (mime.indexOf('json') !== -1) {
        isJson = true;
      } else if (mime.indexOf('xml') !== -1) {
        isXml = true;
      } else if (mime.indexOf('x-www-form-urlencoded') !== -1) {
        isFormUrlEncoded = true;
      } else {
        // for now, default value;
        isJson = true;
      }
      this._setIsJson(isJson);
      this._setIsXml(isXml);
      this._setIsFormUrlEncoded(isFormUrlEncoded);
    },

    // Computes if current boddy array has any value that can be presented.
    _computeHasBody: function(body) {
      return !!(body && body.length);
    },

    // Compute a list of media types for the body array
    _computeBodyTypes: function() {
      this.reset();
      var body = this.body;
      if (!body || !body.length) {
        return;
      }
      var mime = body.map(function(item) {
        return item.key;
      });
      this._setBodyTypes(mime);
      // this.selectedBodyType = mime[0];
    },

    // returns true if given argument is an array and has more than 1 element.
    _computeDisplayBodySelector: function() {
      var size = this.bodyTypes ? this.bodyTypes.length : 0;
      return !!(size && size > 1);
    },

    /**
     * When the selection of body types change it will compute proper
     * body object.
     */
    _computeSelectedBody: function(selectedBodyType) {
      var body = this.body;
      if (!selectedBodyType || !body || !body.length) {
        return undefined;
      }

      for (var i = 0, len = body.length; i < len; i++) {
        if (body[i].key === selectedBodyType) {
          return body[i];
        }
      }

      return undefined;
    },
    /**
     * When the `bodyTypes` change it will set a default (first) mime as
     * selected.
     */
    _bodyTypesChanged: function() {
      var bt;
      if (this.bodyTypes && this.bodyTypes.length) {
        bt = this.bodyTypes[0];
      }
      this.set('selectedBodyType', bt);
    }

  });
Polymer({
      is: 'docs-body-table',

      properties: {
        /**
         * A RAML types definition for the body payload.
         */
        type: Object,

        hasTypes: {
          type: Boolean,
          value: false,
          notify: true,
          computed: '_computeHasTypes(type.*)'
        },
        // If set automatically hides the element which doesn't have parameteres set
        autoHide: {
          type: Boolean,
          value: false
        }
      },

      _computeHasTypes: function() {
        var type = this.type;
        return !!(type && (type.properties || type.type));
      }
    });
(function() {
      Polymer({
        is: 'paper-menu',

        behaviors: [
          Polymer.IronMenuBehavior
        ]
      });
    })();
Polymer({
    is: 'raml-docs-response-panel',
    properties: {
      // List of responses - RAML definition (JSON)
      responses: Array,
      // Computed value if currently panel has anything to display
      hasResponses: {
        type: Boolean,
        notify: true,
        readOnly: true,
        value: false
      },
      // Selected response in the array (0-based)
      selectedResponseStatus: {
        type: Number,
        value: 0
      },
      // Currently selected response object
      selectedResponse: {
        type: Object,
        value: null,
        computed: '_computeSelectedResponse(selectedResponseStatus, responses.length)'
      },
      // Mime type of the body currently displayed.
      selectedBodyType: {
        type: Object,
        value: null
      },
      // Description for selected response and type.
      description: {
        type: String,
        value: '',
        computed: '_computeDescription(selectedResponse, selectedBodyType, selectedResponseStatus)'
      }
    },

    observers: [
      '_responsesChanged(responses.*)'
    ],

    _responsesChanged: function() {
      this.selectedResponseStatus = 0;
      this.clear();

      var d = this.responses;
      this._setHasResponses(!!(d && d.length));
      if (!this.hasResponses) {
        return;
      }
    },

    clear: function() {
      // this.selectedBodyType = null;
      this.bodyTypes = [];
    },

    _computeSelectedResponse: function(selectedResponseStatus, respSize) {
      if (!selectedResponseStatus && selectedResponseStatus !== 0 || !respSize) {
        return;
      }
      return this.responses[selectedResponseStatus];
    },

    _hasProperty: function(obj, property) {
      if (!obj) {
        return false;
      }
      return property in obj;
    },

    _computeCodeClass: function(code) {
      code = Number(code);
      if (code !== code) {
        return '';
      }
      if (code >= 200 && code < 300) {
        return 'green';
      }
      if (code >= 300 && code < 400) {
        return 'blue';
      }
      if (code >= 400 && code < 500) {
        return 'orange';
      }
      if (code >= 500 && code < 600) {
        return 'red';
      }
    },
    // Computes a description for current selected response and type.
    _computeDescription: function(resp, bodyType) {
      if (!resp) {
        return null;
      }
      if ('description' in resp) {
        return resp.description;
      }
      if (bodyType && resp.body && resp.body.length) {
        for (var i = 0, len = resp.body.length; i < len; i++) {
          if (resp.body[i].key === bodyType) {
            if (resp.body[i].description) {
              return resp.body[i].description;
            }
            break;
          }
        }
      }
      return null;
    }
  });
Polymer({
    is: 'raml-docs-method-viewer',
    /**
     * Fired when the user pressed the `try it` button.
     *
     * @event tryit-requested
     */
    properties: {
      // Parent endpoint object
      parentEndpoint: {
        type: Object,
        value: false
      },
      // True if current endpont has a body
      hasBody: {
        value: false,
        type: Boolean,
        computed: '_computeHasBody(raml.body)'
      },
      // Computed name of the parent resource
      parentName: {
        type: String,
        value: null,
        computed: '_computeParentName(parentEndpoint.*)'
      },
      // Computed name of current method
      methodName: {
        type: String,
        computed: '_computeMethodName(raml.*)'
      },
      // Value obtained from the `docs-parameters-table`
      hasUriParameteres: Boolean,
      // Value obtained from the `docs-parameters-table`
      hasQueryParameteres: Boolean,
      // Computed flag if there are any parameters to display
      hasParameters: {
        value: false,
        type: Boolean,
        computed: '_computeHasParameters(hasUriParameteres,hasQueryParameteres)'
      },
      // Value obtained from the `raml-docs-response-panel`
      hasResponses: Boolean,
      /**
       * If true then the element will start listen for the
       * `raml-is-method-changed`, `raml-selected-object-changed` and
       * `raml-selected-path-changed` event and set corresponding properties
       * when needed. It's a replacement for the Polymer's data biding
       * for apps that are not Polymer powered.
       */
      autoHide: {
        type: Boolean,
        value: false,
        observer: '_autoHideChanged'
      },
      // If true then the element will be hidden ui the UI.
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      // If set then the `tryit` button will be hidden.
      noTryit: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        notify: true,
        reflectToAttribute: true
      },
      // A widith below which the `narrow` property will be set to true.
      narrowWidth: {
        type: String,
        value: '768px'
      }
    },

    observers: [
      '_objectChanged(raml.*)'
    ],

    attached: function() {
      this._eventTarget = Polymer.dom(this).host || document;
      if (this.autoHide) {
        this._attacheListeners();
      }
    },

    _autoHideChanged: function(state) {
      if (state) {
        this._attacheListeners();
      } else {
        this._detachListeners();
      }
    },

    _attacheListeners: function() {
      if (!this._eventTarget) {
        this.hidden = true;
        return;
      }
      this._detachListeners();
      this.listen(this._eventTarget, 'raml-is-method-changed',
        '_isMethodHandler');
      this.listen(this._eventTarget, 'raml-selected-object-changed',
        '_selectedChangeHandler');
      this.listen(this._eventTarget, 'raml-selected-parent-changed',
        '_selectedParentChangeHandler');
    },

    _detachListeners: function() {
      if (!this._eventTarget) {
        return;
      }
      this.unlisten(this._eventTarget, 'raml-is-method-changed',
        '_isMethodHandler');
      this.unlisten(this._eventTarget, 'raml-selected-object-changed',
        '_selectedChangeHandler');
      this.unlisten(this._eventTarget, 'raml-selected-parent-changed',
        '_selectedParentChangeHandler');
    },

    // Resets the variables to the original state
    clear: function() {
      this.hasUriParameteres = undefined;
      this.hasQueryParameteres = undefined;
    },

    _objectChanged: function() {
      this.clear();
      // this.hidden = false;
      if (!this.raml) {
        return;
      }
    },

    _computeMethodName: function() {
      var m = this.raml;
      if (!m) {
        return '';
      }
      return m.displayName || m.method;
    },

    _computeHideMethodDesc: function(description) {
      return !description;
    },

    _computeHasParameters: function(hasUriParameteres, hasQueryParameteres) {
      return hasUriParameteres || hasQueryParameteres;
    },

    _computeHasBody: function(body) {
      return !!(body && body.length > 0);
    },

    _isMethodHandler: function(e, detail) {
      var state = detail.state;
      this.hidden = !state;
    },

    _selectedChangeHandler: function(e, detail) {
      if (this.hidden) {
        this.raml = undefined;
        return;
      }
      this.raml = detail.selectedObject;
    },

    _selectedParentChangeHandler: function(e, detail) {
      if (this.hidden) {
        this.parentEndpoint = undefined;
        return;
      }
      this.parentEndpoint = detail.selectedParent;
    },

    _tryIt: function() {
      this.fire('tryit-requested');
    },

    _computeParentName: function() {
      var endpoint = this.parentEndpoint;
      if (!endpoint) {
        return '';
      }
      return endpoint.displayName || endpoint.relativeUri;
    }
  });
Polymer({
    is: 'raml-docs-documentation-viewer',
    properties: {
      // Represent a single documentation object from RAML's documentation node.
      documentation: Object,
      /**
       * If true then the element will start listen for the
       * `raml-is-documentation-changed` and `raml-selected-object-changed`
       * events and sets corresponding properties when needed. It's
       * a replacement for the Polymer's data biding for apps that are
       * not Polymer powered.
       */
      autoHide: {
        type: Boolean,
        value: false,
        observer: '_autoHideChanged'
      },
      // If true then the element will be hidden ui the UI.
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        notify: true,
        reflectToAttribute: true
      },
      // A widith below which the `narrow` property will be set to true.
      narrowWidth: {
        type: String,
        value: '768px'
      }
    },

    attached: function() {
      this._eventTarget = Polymer.dom(this).host || document;
      if (this.autoHide) {
        this._attacheListeners();
      }
    },

    _autoHideChanged: function(state) {
      if (state) {
        this._attacheListeners();
      } else {
        this._detachListeners();
      }
    },

    _attacheListeners: function() {
      if (!this._eventTarget) {
        return;
      }
      this._detachListeners();
      this.listen(this._eventTarget, 'raml-is-documentation-changed',
        '_isDocHandler');
      this.listen(this._eventTarget, 'raml-selected-object-changed',
        '_selectedChangeHandler');
    },

    _detachListeners: function() {
      if (!this._eventTarget) {
        return;
      }
      this.unlisten(this._eventTarget, 'raml-is-documentation-changed',
        '_isDocHandler');
      this.unlisten(this._eventTarget, 'raml-selected-object-changed',
        '_selectedChangeHandler');
    },

    _isDocHandler: function(e, detail) {
      var state = detail.state;
      this.hidden = !state;
    },

    _selectedChangeHandler: function(e, detail) {
      if (this.hidden) {
        this.documentation = undefined;
        return;
      }
      this.documentation = detail.selectedObject;
    }
  });
Polymer({
    is: 'raml-docs-resource-viewer',

    behaviors: [
      Polymer.RamlBehavior,
      Polymer.IronScrollTargetBehavior
    ],
    /**
     * An event fired when the user cliecked on a method/sub-resource link.
     * Before the event is fired the `currentPath` propery is set. If parent
     * element is listening for change on this property then it's redundand to
     * listen for this event.
     *
     * @event raml-path-changed
     * @property {String} path Path requested by the user.
     */
    properties: {
      /**
       * Computed value. List of types used by this endpoint.
       * The elements looks for types inside methods of this resource.
       *
       * It will not search for types in nested resources.
       */
      types: {
        type: Array,
        readOnly: true
      },
      // Computed value. True when the resource has types defined in it.
      hasTypes: {
        type: Boolean,
        value: false,
        computed: '_computeHasTypes(types.length)'
      },
      /**
       * Curently selected path in the RAML JSON structure. Required to compute
       * sub-resources.
       */
      currentPath: {
        type: String,
        notify: true
      },
      // Computed list of methods. It's the element's internal structure.
      methods: Array,
      // Computed list of resources. It's the element's internal structure.
      resources: Array,
      // Computed value, True if the resource has methods or sub-resources.
      hasSubproperties: {
        type: Boolean,
        computed: '_computeHasSubproperties(methods, resources)'
      },
      /**
       * If true then the element will start listen for the
       * `raml-is-resource-changed`, `raml-selected-object-changed` and
       * `raml-selected-path-changed` event and set corresponding properties
       * when needed. It's a replacement for the Polymer's data biding
       * for apps that are not Polymer powered.
       */
      autoHide: {
        type: Boolean,
        value: false,
        observer: '_autoHideChanged'
      },
      // If true then the element will be hidden ui the UI.
      hidden: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      // If true then there's enough space to display right column
      wide: {
        type: Boolean,
        value: false
      },
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        notify: true,
        reflectToAttribute: true
      },
      // A widith below which the `narrow` property will be set to true.
      narrowWidth: {
        type: String,
        value: '768px'
      },
      // If true then the types section is visible.
      typesOpened: {
        type: Boolean,
        value: true
      },
      // If true then the methods and sub-resources section is visible.
      methodsOpened: {
        type: Boolean,
        value: true
      }
    },

    observers: [
      '_computeTypes(raml.*)',
      '_computeMethods(currentPath, raml.*)',
      '_computeResources(currentPath, raml.*)'
    ],

    listeners: {
      'substable.tap': '_subResourceTap',
      'nav-links.tap': '_navLinksTap'
    },

    attached: function() {
      this._eventTarget = Polymer.dom(this).host || document;
      if (this.autoHide) {
        this._attacheListeners();
      }
      this.listen(window, 'scroll', '_scrollHandler');
    },

    detached: function() {
      this._detachListeners();
      this.unlisten(window, 'scroll', '_scrollHandler');
    },

    _autoHideChanged: function(state) {
      if (state) {
        this._attacheListeners();
      } else {
        this._detachListeners();
      }
    },

    _attacheListeners: function() {
      if (!this._eventTarget) {
        this.hidden = true;
        return;
      }
      this._detachListeners();
      this.listen(this._eventTarget, 'raml-is-resource-changed',
        '_isResourceHandler');
      this.listen(this._eventTarget, 'raml-selected-object-changed',
        '_selectedChangeHandler');
      this.listen(this._eventTarget, 'raml-selected-path-changed',
        '_selectedPathChangeHandler');
    },

    _detachListeners: function() {
      if (!this._eventTarget) {
        return;
      }
      this.unlisten(this._eventTarget, 'raml-is-resource-changed',
        '_isResourceHandler');
      this.unlisten(this._eventTarget, 'raml-selected-object-changed',
        '_selectedChangeHandler');
      this.unlisten(this._eventTarget, 'raml-selected-path-changed',
        '_selectedPathChangeHandler');
    },
    /**
     * It's a handler for the `raml-is-resource-changed` event fired
     * by other element. It sets the `hidden` value depending on the
     * event's `state` parameter.
     */
    _isResourceHandler: function(e, detail) {
      var state = detail.state;
      this.hidden = !state;
    },
    /**
     * Handler for the `selectedObject` (from the `<raml-path-to-object>`).
     */
    _selectedChangeHandler: function(e, detail) {
      if (this.hidden) {
        this.raml = undefined;
        return;
      }
      this.raml = detail.selectedObject;
    },

    _selectedPathChangeHandler: function(e, detail) {
      if (this.hidden) {
        this.currentPath = undefined;
        return;
      }
      this.currentPath = detail.path;
    },

    // Computes the name of the resource.
    _computeResourceName: function() {
      var r = this.raml;
      if (!r) {
        return '';
      }
      return r.displayName || r.relativeUri;
    },
    // Computes list of the types in current resource. Called automatically when `raml` change.
    _computeTypes: function() {
      var r = this.raml;
      if (!r) {
        this._setTypes(undefined);
        return;
      }
      var types = [];
      var self = this;
      if (r.methods && r.methods.length) {
        r.methods.forEach(function(method) {
          var type = self._listTypes(method);
          if (type) {
            types = types.concat(type);
          }
        });
      }
      this._setTypes(types);
    },

    _listTypes: function(obj) {
      var self = this;
      var types = [];
      var type = self._extractType(obj);
      if (type) {
        types[types.length] = type;
      }

      if (obj.responses) {
        var keys = Object.keys(obj.responses);
        keys.forEach(function(status) {
          var response = obj.responses[status];
          var type = self._extractType(response);
          if (type) {
            types[types.length] = type;
          }
        });
      }
      return types;
    },

    _extractType: function(obj) {
      if (!obj || !obj.body || !obj.body.length) {
        return;
      }
      return obj.body;
    },

    // Computes if the resource has defined types. It will revalidate when `types` array change.
    _computeHasTypes: function() {
      return !!(this.types && this.types.length);
    },

    _computeMethods: function(currentPath) {
      var r = this.raml;
      if (!currentPath || !r || !r.methods || !r.methods.length) {
        this.methods = null;
        return;
      }
      var methods = [];
      r.methods.forEach(function(method, i) {
        methods[methods.length] = {
          path: currentPath + '.methods.' + i,
          meta: {
            name: method.displayName || method.method,
            description: method.description
          }
        };
      });
      if (methods.length === 0) {
        methods = null;
      }
      this.methods = methods;
    },

    _computeResources: function(currentPath) {
      var r = this.raml;
      if (!currentPath || !r || !r.resources || !r.resources.length) {
        this.resources = null;
        return;
      }
      var resources = [];
      r.resources.forEach(function(resource, i) {
        resources[resources.length] = {
          path: currentPath + '.resources.' + i,
          meta: {
            name: resource.displayName || resource.relativeUri,
            description: resource.description
          }
        };
      });
      if (resources.length === 0) {
        resources = null;
      }
      this.resources = resources;
    },
    // Computes the value for the hasSubproperties property.
    _computeHasSubproperties: function(methods, resources) {
      return !!((methods && methods.length) || (resources && resources.length));
    },

    _subResourceTap: function(e) {
      e.preventDefault();
      e.stopPropagation();
      var path = e.target.dataset.path;
      if (!path) {
        return;
      }
      this.set('currentPath', path);
      this.fire('raml-path-changed', {
        path: path
      });
    },

    _navLinksTap: function(e) {
      e.preventDefault();
      e.stopPropagation();
      var targetId = e.target.getAttribute('href');
      if (!targetId) {
        return;
      }
      var target = this.$$(targetId);
      console.log(target);
      this.scroll(0, target.offsetTop);
    },

    _scrollHandler: function() {
      var elm = this.$$('#nav-links');
      var parent = elm.parentNode;
      var top = parent.getBoundingClientRect().top;
      if (top < 24) {
        var _top = Math.abs(top) + 24;
        elm.style.top = _top + 'px';
      } else {
        elm.style.removeProperty('top');
      }
    },

    // Computes class for the toggle's button icon.
    _computeToggleIconClass: function(opened) {
      var clazz = 'toggle-icon';
      if (opened) {
        clazz += ' opened';
      }
      return clazz;
    },
    // Computes a label for the section toggle buttons.
    _computeToggleActionLabel: function(opened) {
      return opened ? 'Hide' : 'Show';
    },
    /**
     * Toogles types section opened / closed.
     */
    toggleTypesCollapse: function() {
      this.typesOpened = !this.typesOpened;
    },
    /**
     * Toogles types section opened / closed.
     */
    toggleMethodsCollapse: function() {
      this.methodsOpened = !this.methodsOpened;
    }
  });
Polymer({
      is: 'raml-documentation-empty-state'
    });
Polymer({
    is: 'raml-documentation-panel',

    properties: {
      // Selcted path in the path selector.
      path: {
        type: String,
        notify: true,
        observer: '_pathChanged'
      },
      // An object selected in the `raml-path-selector`
      selectedObject: Object,
      // Parent object selected in the `raml-path-selector`
      selectedParent: Object,
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        notify: true,
        reflectToAttribute: true
      },
      // A widith below which the `narrow` property will be set to true.
      narrowWidth: {
        type: String,
        value: '768px'
      },
      // Set to true if the selected object is a method node of the RAML
      isMethod: {
        type: Boolean,
        readOnly: true,
        value: false
      },
      // Set to true if the selected object is a resource node of the RAML
      isResource: {
        type: Boolean,
        readOnly: true,
        value: false
      },
      // Set to true if the selected object is a documentation node of the RAML
      isDocumentation: {
        type: Boolean,
        readOnly: true,
        value: false
      },
      // Computed value if there is any selection made.
      hasSelection: {
        type: Boolean,
        value: false,
        notify: true,
        computed: '_computeHasSelection(isMethod, isResource, isDocumentation)'
      }
    },
    // Returns true if any of the arguments is trurly
    _computeHasSelection: function(isMethod, isResource, isDocumentation) {
      return !!(isMethod || isResource || isDocumentation);
    },
    // Hadnles path change and computes selected object type.
    _pathChanged: function(path) {
      var isMethod = false;
      var isResource = false;
      var isDocumentation = false;

      if (!path) {
        this._setIsMethod(isMethod);
        this._setIsResource(isResource);
        this._setIsDocumentation(isDocumentation);
        return;
      }

      if (path.indexOf('documentation') === 0) {
        isDocumentation = true;
      } else if (/methods\.\d+$/.test(path)) {
        isMethod = true;
      } else if (/resources\.\d+$/.test(path)) {
        isResource = true;
      }

      this._setIsMethod(isMethod);
      this._setIsResource(isResource);
      this._setIsDocumentation(isDocumentation);
    }
  });
Polymer({
    is: 'raml-documentation-viewer',

    behaviors: [Polymer.RamlBehavior],

    properties: {
      /**
       * Name of the `scope` attribute of the `<raml-aware>` element. If set then there's no need
       * to set the `raml` property for this element and the RAML definition should be set via
       * `<raml-aware>` element.
       *
       * Note: When you use `aware` and the you set `raml` property then aware will not be updated.
       * However newest RAML data set win (either set in aware and on this element).
       */
      aware: String,
      // Will be set to true when the `aware` attribute is set. Do not try to set this attribute.
      hasAware: {
        type: Boolean,
        value: false,
        computed: '_computeHasAware(aware)'
      },
      // An object selected in the `raml-path-selector`
      selectedObject: Object,
      // Parent object selected in the `raml-path-selector`
      selectedParent: Object,
      /**
       * Selected path for the documentation panel and for the api structure viewer.
       * It's a path in the JSON structure to the method / endpoint.
       *
       * ### Example
       * ```
       * resources.2.resources.0.method.0
       * ```
       * Which means that currently selected item is the 1st method that is located as a
       * 3rd resource definition (from root) and then as a 1st sub-resource in the API definition.
       */
      path: {
        type: String,
        notify: true
      },
      /**
       * If set it will renders the view in the narrow layout.
       */
      narrow: {
        type: Boolean,
        notify: true
      },
      /**
       * A width below which the `narrow` property will be set to true.
       * Thids element do not controls child elements and they are have own resizable behavior.
       * It just pasess the `narrow` and `narrowWidth` to child elements.
       */
      narrowWidth: {
        type: String,
        notify: true
      }
    },
    // Computes the `hasAware` attribute.
    _computeHasAware: function(aware) {
      return !!aware;
    }
  });
Polymer({
    is: 'api-console-docs',

    properties: {
      // RAML as the JSON produced by the parser. The `.specificvation` part of the output.
      raml: {
        type: Object,
        notify: true,
        readOnly: true
      },

      path: String,
      // If true it will display a narrow layout.
      narrow: {
        type: Boolean,
        notify: true
      },
      // Selected object in the navigation menu and parsed by the
      // `raml-path-selector` element
      selectedObject: Object,
      // A parent endpoint of selected method object (if any).
      selectedParent: Object
    },

    listeners: {
      'app-drawer-transitioned': '_onDraawerTransitionEnd',
    },

    _onDraawerTransitionEnd: function(e) {
      e = Polymer.dom(e);
      var el = this.$$('app-header');
      if (e.rootTarget.opened && this.narrow) {
        el.style.zIndex = 0;
      } else {
        el.style.zIndex = 1;
      }
    }
  });