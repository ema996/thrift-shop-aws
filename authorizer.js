'use strict';

require('dotenv').config();
const db = require('./database-helper.js');
const queryBuilder = require ('./queryBuilder.js');

exports.handler = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    let token = event.authorizationToken;

    authenticate(token).then(user => {
        console.log('User is ', user);
        if(user){
            return buildPolicy(user, event);
        }
        callback('Unauthorized');
    }).then(policy => {
        console.log('Policy is ', JSON.stringify(policy, null, 2));
        if(policy){
            callback(null, policy);
        }
        callback('Unauthorized');
    }).catch(err => {
        console.log('Custom Authorizer Error: ', err);
        callback('Unauthorized');
    });
};

/**
Authenticates the user with the provided token.
**/
function authenticate(token) {
  return getUserByAccessToken(token);
}

async function getUserByAccessToken(accessToken){
    return db.pool.connect().then(client => {
      return client.query(queryBuilder.findUserByToken(),[accessToken]);
  }).then(response => {
    console.log(response);
        if(response && response.rowCount > 0){
            return response.rows[0];
        }
        return false;
    });
    
}


/**
Okta returned claims are packed into API Gateway policy document
**/
function buildPolicy(user, event) {
    const principalId = user.user_id;
    try {
        const apiOptions = {};
        const tmp = event.methodArn.split(':');
        const apiGatewayArnTmp = tmp[5].split('/');
        const awsAccountId = tmp[4];
        apiOptions.region = tmp[3];
        apiOptions.restApiId = apiGatewayArnTmp[0];
        apiOptions.stage = apiGatewayArnTmp[1];
        console.log('apiGatewayArnTmp length ', apiGatewayArnTmp.length);
        console.log('apiGatewayArnTmp ', JSON.stringify(apiGatewayArnTmp, null, 2));


        let resource = '/'; // root resource
        if (apiGatewayArnTmp[3]) {
            resource += apiGatewayArnTmp.slice(3, apiGatewayArnTmp.length).join('/');
        }
        console.log('Resource is, ', resource);


        const policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
        policy.allowAllMethods();
        let authResponse = policy.build();
        authResponse.context = {
            userId: user.user_id
        };

        console.log('Policy is: ', JSON.stringify(authResponse, null, 2));
        return Promise.resolve(authResponse);
    } catch (error) {
        console.log('Error building policy: ', error);
        throw error;
    }
}













/**
 * AuthPolicy receives a set of allowed and denied methods and generates a valid
 * AWS policy for the API Gateway authorizer. The constructor receives the calling
 * user principal, the AWS account ID of the API owner, and an apiOptions object.
 * The apiOptions can contain an API Gateway RestApi Id, a region for the RestApi, and a
 * stage that calls should be allowed/denied for. For example
 * {
 *   restApiId: "xxxxxxxxxx",
 *   region: "us-east-1",
 *   stage: "dev"
 * }
 *
 * var testPolicy = new AuthPolicy("[principal user identifier]", "[AWS account id]", apiOptions);
 * testPolicy.allowMethod(AuthPolicy.HttpVerb.GET, "/users/username");
 * testPolicy.denyMethod(AuthPolicy.HttpVerb.POST, "/pets");
 * context.succeed(testPolicy.build());
 *
 * @class AuthPolicy
 * @constructor
 */
function AuthPolicy(principal, awsAccountId, apiOptions) {
    /**
     * The AWS account id the policy will be generated for. This is used to create
     * the method ARNs.
     *
     * @property awsAccountId
     * @type {String}
     */
    this.awsAccountId = awsAccountId;

    /**
     * The principal used for the policy, this should be a unique identifier for
     * the end user.
     *
     * @property principalId
     * @type {String}
     */
    this.principalId = principal;

    /**
     * The policy version used for the evaluation. This should always be "2012-10-17"
     *
     * @property version
     * @type {String}
     * @default "2012-10-17"
     */
    this.version = "2012-10-17";

    /**
     * The regular expression used to validate resource paths for the policy
     *
     * @property pathRegex
     * @type {RegExp}
     * @default '^\/[/.a-zA-Z0-9-\*]+$'
     */
    this.pathRegex = new RegExp('^[/.a-zA-Z0-9-\*]+$');

    // these are the internal lists of allowed and denied methods. These are lists
    // of objects and each object has 2 properties: A resource ARN and a nullable
    // conditions statement.
    // the build method processes these lists and generates the approriate
    // statements for the final policy
    this.allowMethods = [];
    this.denyMethods = [];

    if (!apiOptions || !apiOptions.restApiId) {
      this.restApiId = "*";
    } else {
      this.restApiId = apiOptions.restApiId;
    }
    if (!apiOptions || !apiOptions.region) {
      this.region = "*";
    } else {
      this.region = apiOptions.region;
    }
    if (!apiOptions || !apiOptions.stage) {
      this.stage = "*";
    } else {
      this.stage = apiOptions.stage;
    }
}

/**
 * A set of existing HTTP verbs supported by API Gateway. This property is here
 * only to avoid spelling mistakes in the policy.
 *
 * @property HttpVerb
 * @type {Object}
 */
 AuthPolicy.HttpVerb = {
   GET     : "GET",
   POST    : "POST",
   PUT     : "PUT",
   PATCH   : "PATCH",
   HEAD    : "HEAD",
   DELETE  : "DELETE",
   OPTIONS : "OPTIONS",
   ALL     : "*"
 };

AuthPolicy.prototype = (function() {
  /**
   * Adds a method to the internal lists of allowed or denied methods. Each object in
   * the internal list contains a resource ARN and a condition statement. The condition
   * statement can be null.
   *
   * @method addMethod
   * @param {String} The effect for the policy. This can only be "Allow" or "Deny".
   * @param {String} he HTTP verb for the method, this should ideally come from the
   *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
   * @param {String} The resource path. For example "/pets"
   * @param {Object} The conditions object in the format specified by the AWS docs.
   * @return {void}
   */
  var addMethod = function(effect, verb, resource, conditions) {
    if (verb != "*" && !AuthPolicy.HttpVerb.hasOwnProperty(verb)) {
      throw new Error("Invalid HTTP verb " + verb + ". Allowed verbs in AuthPolicy.HttpVerb");
    }

    if (!this.pathRegex.test(resource)) {
      throw new Error("Invalid resource path: " + resource + ". Path should match " + this.pathRegex);
    }

    var cleanedResource = resource;
    if (resource.substring(0, 1) == "/") {
        cleanedResource = resource.substring(1, resource.length);
    }
    var resourceArn = "arn:aws:execute-api:" +
      this.region + ":" +
      this.awsAccountId + ":" +
      this.restApiId + "/" +
      this.stage + "/" +
      verb + "/" +
      cleanedResource;

    if (effect.toLowerCase() == "allow") {
      this.allowMethods.push({
        resourceArn: resourceArn,
        conditions: conditions
      });
    } else if (effect.toLowerCase() == "deny") {
      this.denyMethods.push({
        resourceArn: resourceArn,
        conditions: conditions
      })
    }
  };

  /**
   * Returns an empty statement object prepopulated with the correct action and the
   * desired effect.
   *
   * @method getEmptyStatement
   * @param {String} The effect of the statement, this can be "Allow" or "Deny"
   * @return {Object} An empty statement object with the Action, Effect, and Resource
   *                  properties prepopulated.
   */
  var getEmptyStatement = function(effect) {
    effect = effect.substring(0, 1).toUpperCase() + effect.substring(1, effect.length).toLowerCase();
    var statement = {};
    statement.Action = "execute-api:Invoke";
    statement.Effect = effect;
    statement.Resource = [];

    return statement;
  };

  /**
   * This function loops over an array of objects containing a resourceArn and
   * conditions statement and generates the array of statements for the policy.
   *
   * @method getStatementsForEffect
   * @param {String} The desired effect. This can be "Allow" or "Deny"
   * @param {Array} An array of method objects containing the ARN of the resource
   *                and the conditions for the policy
   * @return {Array} an array of formatted statements for the policy.
   */
  var getStatementsForEffect = function(effect, methods) {
    var statements = [];

    if (methods.length > 0) {
      var statement = getEmptyStatement(effect);

      for (var i = 0; i < methods.length; i++) {
        var curMethod = methods[i];
        if (curMethod.conditions === null || curMethod.conditions.length === 0) {
          statement.Resource.push(curMethod.resourceArn);
        } else {
          var conditionalStatement = getEmptyStatement(effect);
          conditionalStatement.Resource.push(curMethod.resourceArn);
          conditionalStatement.Condition = curMethod.conditions;
          statements.push(conditionalStatement);
        }
      }

      if (statement.Resource !== null && statement.Resource.length > 0) {
        statements.push(statement);
      }
    }

    return statements;
  };

  return {
    constructor: AuthPolicy,

    /**
     * Adds an allow "*" statement to the policy.
     *
     * @method allowAllMethods
     */
    allowAllMethods: function() {
      addMethod.call(this, "allow", "*", "*", null);
    },

    /**
     * Adds a deny "*" statement to the policy.
     *
     * @method denyAllMethods
     */
    denyAllMethods: function() {
      addMethod.call(this, "deny", "*", "*", null);
    },

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of allowed
     * methods for the policy
     *
     * @method allowMethod
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example "/pets"
     * @return {void}
     */
    allowMethod: function(verb, resource) {
      addMethod.call(this, "allow", verb, resource, null);
    },

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of denied
     * methods for the policy
     *
     * @method denyMethod
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example "/pets"
     * @return {void}
     */
    denyMethod : function(verb, resource) {
      addMethod.call(this, "deny", verb, resource, null);
    },

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of allowed
     * methods and includes a condition for the policy statement. More on AWS policy
     * conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition
     *
     * @method allowMethodWithConditions
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example "/pets"
     * @param {Object} The conditions object in the format specified by the AWS docs
     * @return {void}
     */
    allowMethodWithConditions: function(verb, resource, conditions) {
      addMethod.call(this, "allow", verb, resource, conditions);
    },

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of denied
     * methods and includes a condition for the policy statement. More on AWS policy
     * conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition
     *
     * @method denyMethodWithConditions
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example "/pets"
     * @param {Object} The conditions object in the format specified by the AWS docs
     * @return {void}
     */
    denyMethodWithConditions : function(verb, resource, conditions) {
      addMethod.call(this, "deny", verb, resource, conditions);
    },

    /**
     * Generates the policy document based on the internal lists of allowed and denied
     * conditions. This will generate a policy with two main statements for the effect:
     * one statement for Allow and one statement for Deny.
     * Methods that includes conditions will have their own statement in the policy.
     *
     * @method build
     * @return {Object} The policy object that can be serialized to JSON.
     */
    build: function() {
      if ((!this.allowMethods || this.allowMethods.length === 0) &&
          (!this.denyMethods || this.denyMethods.length === 0)) {
        throw new Error("No statements defined for the policy");
      }

      var policy = {};
      policy.principalId = this.principalId;
      var doc = {};
      doc.Version = this.version;
      doc.Statement = [];

      doc.Statement = doc.Statement.concat(getStatementsForEffect.call(this, "Allow", this.allowMethods));
      doc.Statement = doc.Statement.concat(getStatementsForEffect.call(this, "Deny", this.denyMethods));

      policy.policyDocument = doc;

      return policy;
    }
  };

})();