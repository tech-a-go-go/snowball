
export default class TimeRange {

    constructor(start, end) {
        this.start = start
        this.end = end
    }

    contains(other) {
        return this.start <= other.start && this.end >= other.end;
    }

    overlaps(other) {
        return this.start < other.end && this.end > other.start;
    }

    within(other) {
        return this.start >= other.start && this.end <= other.end;
    }
}