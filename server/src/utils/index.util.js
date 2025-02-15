const uuid = require("uuid");
const url = require("url");
const config = require("../config/index.config");

const generate_code = () => {
  return Math.round(Math.random() * (999999 - 100000) + 100000);
};

const generate_rand_string = (length) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const characters_length = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * characters_length));
    counter += 1;
  }
  return result;
};

const capitalize = (text) => {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
};

const generate_login_url = (redirect_url) => {
  const login_url = new url.URL(
    config[process.env.NODE_ENV]?.identity_login_url ||
      config.identity_login_url
  );
  const query_params = {
    state: uuid.v4(),
    nonce: uuid.v4(),
    client_id:
      config[process.env.NODE_ENV]?.login_client_id || config.login_client_id,
    response_mode: "fragment",
    response_type: "code",
    scope: "openid",
    redirect_uri: redirect_url,
  };

  Object.keys(query_params).forEach((key) => {
    login_url.searchParams.append(key, query_params[key]);
  });

  return login_url;
};

const submitted_data_to_object = (submitted_data) => {
  const return_value = {};
  submitted_data.forEach((submission) => {
    return_value[submission.field_id] = submission.value;
  });
  return return_value;
};

const deduplicate_array = (list, deduplication_key) => {
  const deduplication_cache = {};
  return list.filter((item) => {
    if (deduplication_cache.hasOwnProperty(item[deduplication_key])) {
      return false;
    }
    deduplication_cache[item[deduplication_key]] = true;
    return true;
  });
};
const createEnum = (values) => {
  const enumObject = {};
  for (const val of values) {
    enumObject[val] = val;
  }
  return Object.freeze(enumObject);
};

module.exports = {
  generate_code,
  generate_login_url,
  submitted_data_to_object,
  capitalize,
  generate_rand_string,
  deduplicate_array,
  createEnum,
};
