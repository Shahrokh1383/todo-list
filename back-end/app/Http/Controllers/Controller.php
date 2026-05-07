<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

abstract class Controller
{
    /**
     * Success Response with pagination support
     */
    protected function success(
        mixed $data = null,
        string $message = 'Operation successful',
        int $code = 200,
        array $meta = []
    ): JsonResponse {
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $this->transformData($data),
        ];

        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        return response()->json($response, $code);
    }

    /**
     * Error Response
     */
    protected function error(
        string $message,
        int $code = 400,
        ?array $errors = null
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }

    /**
     * No Content Response
     */
    protected function noContent(): JsonResponse
    {
        return response()->json(null, 204);
    }

    /**
     * Created Response
     */
    protected function created(
        mixed $data = null,
        string $message = 'Resource created successfully',
        string $location = null
    ): JsonResponse {
        $response = response()->json([
            'success' => true,
            'message' => $message,
            'data' => $this->transformData($data),
        ], 201);

        if ($location) {
            $response->header('Location', $location);
        }

        return $response;
    }

    /**
     * Transform data with pagination support
     */
    private function transformData(mixed $data): mixed
    {
        if ($data instanceof LengthAwarePaginator) {
            return [
                'items' => $data->items(),
                'pagination' => [
                    'total' => $data->total(),
                    'per_page' => $data->perPage(),
                    'current_page' => $data->currentPage(),
                    'last_page' => $data->lastPage(),
                    'from' => $data->firstItem(),
                    'to' => $data->lastItem(),
                ],
            ];
        }

        if ($data instanceof Collection) {
            return $data->values();
        }

        return $data;
    }
}