import * as assert from "assert";
import checkPassword from "./checkPassword";

export function checkPasswordTest() {
    assert.strictEqual(checkPassword("123456"), -1);
}
