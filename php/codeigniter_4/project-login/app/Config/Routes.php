<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 *///

# The Auto Routing (Legacy) is very dangerous. It is easy to create vulnerable apps
# where controller filters or CSRF protection are bypassed.
# Routes Auth
$routes->get('/', 'Auth::index');
$routes->get('login', 'Auth::index');
$routes->post('login/process', 'Auth::processLogin');
$routes->get('logout', 'Auth::logout');
$routes->get('home', 'Home::index');
