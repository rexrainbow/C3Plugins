// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_Firebase_Authentication = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var pluginProto = cr.plugins_.Rex_Firebase_Authentication.prototype;

    /////////////////////////////////////
    // Object type class
    pluginProto.Type = function (plugin) {
        this.plugin = plugin;
        this.runtime = plugin.runtime;
    };

    var typeProto = pluginProto.Type.prototype;

    typeProto.onCreate = function () {
    };

    /////////////////////////////////////
    // Instance class
    pluginProto.Instance = function (type) {
        this.type = type;
        this.runtime = type.runtime;
    };

    var instanceProto = pluginProto.Instance.prototype;

    instanceProto.onCreate = function () {
        this.isMyLoginCall = false;
        this.isMyLogOutCall = false;
        this.lastError = null;
        this.lastAuthData = null;
        this.lastLoginResult = null;

        var self = this;
        var setupFn = function () {
            self.setOnLogoutHandler();
        }
        window.rexObjs.FirebaseObj.OnInit.AddHandler(setupFn);
    };

    // 3.x	
    var getAuthObj = function () {
        return window["firebase"]["auth"]();
    };

    instanceProto.setOnLogoutHandler = function () {
        var self = this;
        var onAuthStateChanged = function (authData) {
            if (authData) {
                // user authenticated with firebase
                //console.log("User ID: " + authData.uid + ", Provider: " + authData.provider);

                var isMyLoginCall = self.isMyLoginCall && !self.isMyLogOutCall;
                self.lastError = null;
                self.lastAuthData = authData;

                if (!isMyLoginCall)
                    self.runtime.trigger(conds.OnLoginByOther, self);
                else {
                    self.isMyLoginCall = false;
                    self.runtime.trigger(conds.OnLoginSuccessful, self);
                }

            }
            else {
                var isMyLogOutCall = self.isMyLogOutCall;
                self.isMyLogOutCall = false;
                self.lastAuthData = null;
                self.lastLoginResult = null;

                // user is logged out                
                if (!isMyLogOutCall)
                    self.runtime.trigger(conds.OnLoggedOutByOther, self);
                else
                    self.runtime.trigger(conds.OnLoggedOut, self);

            }
        };

        getAuthObj()["onAuthStateChanged"](onAuthStateChanged);
    };

    /**BEGIN-PREVIEWONLY**/
    var fake_ret = {
        value: 0,
        set_any: function (value) { this.value = value; },
        set_int: function (value) { this.value = value; },
        set_float: function (value) { this.value = value; },
        set_string: function (value) { this.value = value; },
    };

    instanceProto.getDebuggerValues = function (propsections) {
        var provider;
        if (Cnds.prototype.IsAnonymous.call(this)) {
            provider = "anonymous";
        }
        else {
            exps.Provider.call(this, fake_ret);
            var provider = fake_ret.value;
        }

        exps.DisplayName.call(this, fake_ret);
        var displayname = fake_ret.value;

        exps.Email.call(this, fake_ret);
        var email = fake_ret.value;

        exps.PhotoURL.call(this, fake_ret);
        var photoURL = fake_ret.value;

        exps.AccessToken.call(this, fake_ret);
        var accessToken = fake_ret.value;

        var self = this;
        propsections.push({
            "title": this.type.name,
            "properties": [
                { "name": "UserID", "value": getUserProperty("uid"), "readonly": true },
                { "name": "Provider", "value": provider, "readonly": true },
                { "name": "Display name", "value": displayname, "readonly": true },
                { "name": "Email", "value": email, "readonly": true },
                { "name": "PhotoURL", "value": photoURL, "readonly": true },
                { "name": "AccessToken", "value": accessToken, "readonly": true },
            ]
        });
    };

    instanceProto.onDebugValueEdited = function (header, name, value) {
    };
    /**END-PREVIEWONLY**/

    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    pluginProto.cnds = new Cnds();

    Cnds.prototype.EmailPassword_OnCreateAccountSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnCreateAccountError = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnChangingPasswordSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnChangingPasswordError = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnSendPasswordResetEmailSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnSendPasswordResetEmailError = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnDeleteUserSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnDeleteUserError = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnUpdatingProfileSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnUpdatingProfileError = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnUpdatingEmailSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnUpdatingEmailError = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnSendVerificationEmailSuccessful = function () {
        return true;
    };

    Cnds.prototype.EmailPassword_OnSendVerificationEmailError = function () {
        return true;
    };


    Cnds.prototype.IsAnonymous = function () {
        var user = getAuthObj()["currentUser"];
        if (user)
            return user["isAnonymous"];
        else
            return false;
    };

    Cnds.prototype.OnLoginSuccessful = function () {
        return true;
    };

    Cnds.prototype.OnLoginError = function () {
        return true;
    };

    Cnds.prototype.OnLoggedOut = function () {
        return true;
    };

    Cnds.prototype.IsLogin = function () {
        return (getAuthObj()["currentUser"] != null);
    };

    Cnds.prototype.OnLoginByOther = function () {
        return true;
    };

    Cnds.prototype.OnLoggedOutByOther = function () {
        return true;
    };

    Cnds.prototype.OnLinkSuccessful = function () {
        return true;
    };

    Cnds.prototype.OnLinkError = function () {
        return true;
    };

    var conds = cr.plugins_.Rex_Firebase_Authentication.prototype.cnds;
    //////////////////////////////////////
    // Actions
    function Acts() { };
    pluginProto.acts = new Acts();

    var addHandler = function (self, authObj, successTrig, errorTrig) {
        var onSuccess = function (result) {
            self.lastError = null;
            self.lastAuthData = result;
            if (successTrig)
                self.runtime.trigger(successTrig, self);
        };
        var onError = function (error) {
            self.lastError = error;
            self.lastAuthData = null;
            if (errorTrig)
                self.runtime.trigger(errorTrig, self);
        };
        authObj["then"](onSuccess)["catch"](onError);
    };

    var addLoginHandler = function (self, authObj) {
        var onSuccess = function (result) {
            self.lastLoginResult = result;
        };
        var onError = function (error) {
            self.isMyLoginCall = false;
            self.lastError = error;
            self.lastLoginResult = null;
            self.runtime.trigger(conds.OnLoginError, self);
        };
        self.isMyLoginCall = true;
        authObj["then"](onSuccess)["catch"](onError);
    }

    Acts.prototype.EmailPassword_CreateAccount = function (email, password) {
        var authObj = getAuthObj()["createUserWithEmailAndPassword"](email, password);
        addHandler(this, authObj,
            conds.EmailPassword_OnCreateAccountSuccessful,
            conds.EmailPassword_OnCreateAccountError
        );
    };

    Acts.prototype.EmailPassword_Login = function (email, password) {
        var authObj = getAuthObj();
        addLoginHandler(this, authObj["signInWithEmailAndPassword"](email, password));
    };

    Acts.prototype.EmailPassword_ChangePassword = function (newPassword_) {
        var authObj = getAuthObj()["currentUser"]["updatePassword"](newPassword_);
        addHandler(this, authObj,
            conds.EmailPassword_OnChangingPasswordSuccessful,
            conds.EmailPassword_OnChangingPasswordError
        );
    };

    Acts.prototype.EmailPassword_SendPasswordResetEmail = function (email) {
        var authObj = getAuthObj()["sendPasswordResetEmail"](email);
        addHandler(this, authObj,
            conds.EmailPassword_OnSendPasswordResetEmailSuccessful,
            conds.EmailPassword_OnSendPasswordResetEmailError
        );
    };

    Acts.prototype.EmailPassword_DeleteUser = function () {
        var authObj = getAuthObj()["currentUser"]["delete"]();
        addHandler(this, authObj,
            conds.EmailPassword_OnDeleteUserSuccessful,
            conds.EmailPassword_OnDeleteUserError
        );
    };

    Acts.prototype.Anonymous_Login = function () {
        var authObj = getAuthObj();
        addLoginHandler(this, authObj["signInAnonymously"]());
    };

    Acts.prototype.AuthenticationToken_Login = function (token_) {
        var authObj = getAuthObj();
        addLoginHandler(this, authObj["signInWithCustomToken"](token_));
    };

    var PROVIDER_TYPE = ["facebook", "twitter", "github", "google"];
    var capitalizeFirstLetter = function (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    };
    Acts.prototype.ProviderAuthentication_Login = function (provider, type_, scope_) {
        if (typeof (provider) === "number")
            provider = PROVIDER_TYPE[provider];

        provider = capitalizeFirstLetter(provider) + "AuthProvider";
        var providerObj = new window["firebase"]["auth"][provider]();
        if (scope_ != "")
            providerObj["addScope"](scope_);

        var authObj = getAuthObj();
        if (type_ === 0)    // signInWithPopup
        {
            addLoginHandler(this, authObj["signInWithPopup"](providerObj));
        }
        else    // signInWithRedirect
        {
            authObj["signInWithRedirect"](providerObj);
            addLoginHandler(this, authObj["getRedirectResult"]());
        }
    };

    Acts.prototype.AuthWithOAuthToken_FB = function (accessToken) {
        if (accessToken == "") {
            if (typeof (FB) == null)
                return;

            var authResponse = FB["getAuthResponse"]();
            if (!authResponse)
                return;

            accessToken = authResponse["accessToken"];
        }

        var credential = window["firebase"]["auth"]["FacebookAuthProvider"]["credential"](accessToken);
        var authObj = getAuthObj();
        addLoginHandler(this, authObj["signInWithCredential"](credential));
    };

    Acts.prototype.LoggingOut = function () {
        this.isMyLogOutCall = true;
        getAuthObj()["signOut"]();
    };

    Acts.prototype.GoOffline = function () {
        window["firebase"]["database"]()["goOffline"]();
    };

    Acts.prototype.GoOnline = function () {
        window["firebase"]["database"]()["goOnline"]();
    };

    Acts.prototype.LinkToFB = function (accessToken) {
        var user = getAuthObj()["currentUser"];
        if (user == null) {
            return;
        }

        if (accessToken == "") {
            if (typeof (FB) == null)
                return;

            var authResponse = FB["getAuthResponse"]();
            if (!authResponse)
                return;

            accessToken = authResponse["accessToken"];
        }

        var credential = window["firebase"]["auth"]["FacebookAuthProvider"]["credential"](accessToken);
        var authObj = user["link"](credential);
        addHandler(this, authObj,
            conds.OnLinkSuccessful,
            conds.OnLinkError
        );
    };

    Acts.prototype.LinkToGoogle = function (id_token) {
        var user = getAuthObj()["currentUser"];
        if (user == null) {
            return;
        }

        var credential = window["firebase"]["auth"]["GoogleAuthProvider"]["credential"](id_token);
        var authObj = user["link"](credential);
        addHandler(this, authObj,
            conds.OnLinkSuccessful,
            conds.OnLinkError
        );
    };

    Acts.prototype.LinkToEmailPassword = function (email, password) {
        var user = getAuthObj()["currentUser"];
        if (user == null) {
            return;
        }

        var credential = window["firebase"]["auth"]["EmailAuthProvider"]["credential"](email, password);
        var authObj = user["link"](credential);
        addHandler(this, authObj,
            conds.OnLinkSuccessful,
            conds.OnLinkError
        );
    };

    Acts.prototype.UpdateProfile = function (displayName, photoURL) {
        var self = this;
        var user = getAuthObj()["currentUser"];
        var data = {
            "displayName": displayName,
            "photoURL": photoURL,
        }
        var onSuccess = function () {
            self.runtime.trigger(conds.EmailPassword_OnUpdatingProfileSuccessful, self);
        };
        var onError = function () {
            self.runtime.trigger(conds.EmailPassword_OnUpdatingProfileError, self);
        };
        user["updateProfile"](data)["then"](onSuccess)["catch"](onError);
    };

    Acts.prototype.UpdateEmail = function (email) {
        var self = this;
        var user = getAuthObj()["currentUser"];
        var onSuccess = function () {
            self.runtime.trigger(conds.EmailPassword_OnUpdatingEmailSuccessful, self);
        };
        var onError = function () {
            self.runtime.trigger(conds.EmailPassword_OnUpdatingEmailError, self);
        };
        user["updateEmail"](email)["then"](onSuccess)["catch"](onError);
    };

    Acts.prototype.SendEmailVerification = function (email) {
        var self = this;
        var user = getAuthObj()["currentUser"];
        var onSuccess = function () {
            self.runtime.trigger(conds.EmailPassword_OnSendVerificationEmailSuccessful, self);
        };
        var onError = function () {
            self.runtime.trigger(conds.EmailPassword_OnSendVerificationEmailError, self);
        };
        user["sendEmailVerification"]()["then"](onSuccess)["catch"](onError);
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    pluginProto.exps = new Exps();

    var getUserProperty = function (p) {
        var user = getAuthObj()["currentUser"];
        return (user) ? user[p] : "";
    };
    var getProviderProperty = function (p, idx) {
        var user = getAuthObj()["currentUser"];
        if (!user)
            return "";

        if (idx == null) idx = 0;
        var providerData = user["providerData"][idx];
        var val = (providerData) ? providerData[p] : "";
        return val;
    };


    Exps.prototype.ErrorCode = function (ret) {
        var val = (!this.lastError) ? "" : this.lastError["code"];
        ret.set_string(val || "");
    };

    Exps.prototype.ErrorMessage = function (ret) {
        var val = (!this.lastError) ? "" : this.lastError["message"];
        ret.set_string(val || "");
    };

    Exps.prototype.UserID = function (ret) {
        ret.set_string(getUserProperty("uid") || "");
    };
    Exps.prototype.Provider = function (ret) {
        ret.set_string(getProviderProperty("providerId") || "");
    };

    Exps.prototype.DisplayName = function (ret) {
        ret.set_string(getUserProperty("displayName") || "");
    };
    Exps.prototype.UserIDFromProvider = function (ret) {
        ret.set_string(getProviderProperty("uid") || "");
    };
    Exps.prototype.AccessToken = function (ret) {
        ret.set_string(this.lastLoginResult["credential"]["accessToken"] || "");
    };
    Exps.prototype.Email = function (ret) {
        ret.set_string(getUserProperty("email") || "");
    };
    Exps.prototype.UserName = function (ret) {
        ret.set_string(getUserProperty("displayName") || "");
    };
    Exps.prototype.ErrorDetail = function (ret) {      
        var val = (!this.lastError) ? "" : this.lastError["detail"];
        if (val == null)
            val = "";
        ret.set_string(val);
    };
    Exps.prototype.PhotoURL = function (ret) {
        ret.set_string(getUserProperty("photoURL") || "");
    };

    var exps = cr.plugins_.Rex_Firebase_Authentication.prototype.exps;
}());