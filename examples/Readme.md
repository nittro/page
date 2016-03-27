Examples of Nittro Page usage
=============================

Read through all of the code, there isn't that much; but the important
stuff happens in the presenters (snippets get invalidated) and in the
layout template (Nittro gets loaded).

The Dynamic snippet example makes use of a common pattern to deal
with the snippets on the server side: there's a property on the presenter
which defaults to `NULL` (`$entries`) and a getter for this property
which populates it with data e.g. from the database when it's first
accessed - but this gives you the opportunity to populate the property
_before_ this happens, for example when you're adding a new entry
or editing an existing one - so that the render method and consecutively
the template only deal with the one affected entry.

To run the examples, just do a `composer install` and then run the
PHP built-in webserver using e.g. `php -S localhost:8000` and then
visit http://localhost:8000/examples/ in your browser.
