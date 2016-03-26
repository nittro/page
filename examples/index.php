<?php


$container = require_once __DIR__ . '/app/bootstrap.php';
$container->getByType('Nette\Application\Application')->run();
