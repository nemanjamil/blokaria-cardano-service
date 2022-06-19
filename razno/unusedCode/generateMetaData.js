const generateMetaData = (qrCodeDbData) => {

    console.log('\n\ngenerateMetaData qrCodeDbData : ', qrCodeDbData);

    let internalCode = {
        k: {
            string: "internalCode",
        },
        v: {
            string: qrCodeDbData.walletQrId,
        },
    };
    let merchantName = {
        k: {
            string: "CreatorName",
        },
        v: {
            string: qrCodeDbData.userFullname,
        },
    };
    let productName = {
        k: {
            string: "ProductName",
        },
        v: {
            string: qrCodeDbData.productName,
        },
    };

    let merchantEmail = {
        k: {
            string: "CreatorEmail",
        },
        v: {
            string: qrCodeDbData.userEmail,
        },
    };

    let merchantMessage = {
        k: {
            string: "CreatorMessage",
        },
        v: {
            string: qrCodeDbData.userDesc,
        },
    };

    let clientName = {
        k: {
            string: "OwnerName",
        },
        v: {
            string: qrCodeDbData.clientName,
        },
    };

    let clientEmail = {
        k: {
            string: "OwnerEmail",
        },
        v: {
            string: qrCodeDbData.clientEmail,
        },
    };

    let clientMessage = {
        k: {
            string: "OwnerMessage",
        },
        v: {
            string: qrCodeDbData.clientMessage,
        },
    };

    let productLink = {
        k: {
            string: "WebSiteParams",
        },
        v: {
            string: `/status/${qrCodeDbData.walletQrId}`,
        },
    };

    let webSite = {
        k: {
            string: "WebSiteDomain",
        },
        v: {
            string: process.env.BLOKARIA_WEBSITE,
        },
    };

    let nftimage = {
        k: {
            string: "NftImageHash",
        },
        v: {
            string: qrCodeDbData.nftimage,
        },
    };

    let contributorData = {
        k: {
            string: "Contributor",
        },
        v: {
            string: qrCodeDbData.contributorData,
        },
    };

    let finalArray = [];
    finalArray.push(productName);

    finalArray.push(merchantName);
    finalArray.push(merchantEmail);
    finalArray.push(merchantMessage);

    qrCodeDbData.ownernamecb ? finalArray.push(clientName) : "";
    qrCodeDbData.clientemailcb ? finalArray.push(clientEmail) : "";

    finalArray.push(clientMessage);

    finalArray.push(productLink);
    finalArray.push(webSite);
    finalArray.push(internalCode);
    qrCodeDbData.nftimage ? finalArray.push(nftimage) : "";

    qrCodeDbData.contributorData ? finalArray.push(contributorData) : "";

    console.log('\n\n\ finalArray');
    console.dir(finalArray, { depth: null });

    return finalArray;
}