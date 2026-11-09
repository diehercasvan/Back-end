<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Intercepta peticiones antes de ejecutar el controlador
        if (!session()->get('logged_in')) {
            return redirect()->to('/login')->with('error', 'Acceso denegado. Inicie sesión.');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No se requiere posprocesamiento
    }
}