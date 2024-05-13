export class ArrayHelper {

    static isEmpty(arr) : boolean {
        if (arr === undefined || arr.length == 0) {
            return true;
        }
        return false;
    }

}