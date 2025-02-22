import { AjaxOptions, QueryParameter, Result } from "jinqu";

export interface IRequestProvider<TOptions extends AjaxOptions = AjaxOptions> {
    request<TResult, TExtra = {}>(prms: QueryParameter[], options: TOptions[]): PromiseLike<Result<TResult, TExtra>>;
}
