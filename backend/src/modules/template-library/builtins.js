"use strict";

const {
  TemplateRegistry,
} =
  require(
    "./registry"
  );

const home =
  require(
    "./templates/home-default"
  );

const agency =
  require(
    "./templates/agency-default"
  );

const services =
  require(
    "./templates/services-default"
  );

const contact =
  require(
    "./templates/contact-default"
  );

function createBuiltinTemplateRegistry() {
  return new TemplateRegistry({
    templates: [
      home,
      agency,
      services,
      contact,
    ],
  });
}

module.exports = {
  createBuiltinTemplateRegistry,
};
