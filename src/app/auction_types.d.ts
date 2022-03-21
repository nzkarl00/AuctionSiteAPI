type Auction = {
    /**
     * Unique identifier for an auction
     */
    auctionId: number,
    /**
     * Title of the auction
     */
    auctionTitle: string,
    /**
     * Description of the auction
     */
    auctionDesc: string,
    /**
     * Date the auction will finsh
     */
    auctionEnd: Date,
    /**
     * File path to the image thumbnail for the auction
     */
    auctionImage: string,
    /**
     * Minimum bid for the item to be sold
     */
    auctionReserve: number,
    /**
     * ID of the user selling the item
     */
    auctionSellerId: number,
    /**
     * ID of the category the item is listed in
     */
    auctionCategoryId: number
}