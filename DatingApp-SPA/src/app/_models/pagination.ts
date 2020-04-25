import { ɵangular_packages_animations_browser_browser_a } from '@angular/animations/browser';

export interface Pagination {
currentPage: number;
itemsPerPage: number;
totalItems: number;
totalPages: number;
}

export class PaginatedResult<T> {
    result: T;
    pagination: Pagination;
}
